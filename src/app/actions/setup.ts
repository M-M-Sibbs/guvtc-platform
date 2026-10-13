"use server";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { count } from "drizzle-orm";
import { z } from "zod";
import { db, schema as s } from "@/db";
import { runSeed } from "@/db/seed-core";
import { rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { setupNeeded, codeMatches } from "@/lib/setup";

export type SetupState = { message?: string };

const schema = z.object({
  name: z.string().trim().min(3, "Enter your full name"),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(10, "Use at least 10 characters").regex(/[A-Za-z]/, "Include a letter").regex(/[0-9]/, "Include a number"),
  admissionsEmail: z.string().trim().email("Enter the admissions inbox email"),
});

export async function runSetup(_: SetupState, fd: FormData): Promise<SetupState> {
  if (!(await rateLimit("setup", 10, 900))) return { message: "Too many attempts. Wait 15 minutes." };
  if (!(await setupNeeded())) return { message: "Setup has already been completed. Sign in instead." };
  if (!codeMatches(String(fd.get("code") ?? ""))) return { message: "The setup code is not correct. Use the value you saved as SETUP_CODE in Vercel." };
  const parsed = schema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { message: parsed.error.issues[0].message };
  if (fd.get("password") !== fd.get("confirm")) return { message: "The two passwords do not match." };
  const d = parsed.data;
  const demo = fd.get("demo") === "on";

  const [{ n: courseCount }] = await db.select({ n: count() }).from(s.courses);
  if (courseCount === 0) {
    // Empty database: load the course catalogue (and optional demo content) plus the administrator.
    await runSeed({ production: !demo, adminEmail: d.email, adminName: d.name, password: d.password, mustChangePassword: false, admissionsEmail: d.admissionsEmail });
  } else {
    // Courses already exist (e.g. all accounts were removed): never wipe data — just recreate an administrator.
    const [u] = await db.insert(s.users).values({ email: d.email, name: d.name, role: "SUPER_ADMIN", passwordHash: await bcrypt.hash(d.password, 12) }).returning();
    await db.insert(s.staff).values({ userId: u.id, staffNumber: `ST-ADMIN-${Date.now().toString(36)}`, department: "Administration", title: "System administrator" });
  }
  await audit(null, "setup.complete", "system", null, { demo, admin: d.email });
  redirect("/login?setup=1");
}
