import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { SESSION_COOKIE, SESSION_HOURS, signSession, verifySession } from "./session";
import { can, type Capability } from "./permissions";
import type { Role } from "@/db/schema";

export type CurrentUser = { id: string; email: string; name: string; role: Role; studentId?: string; staffId?: string; mustChangePassword?: boolean };

export async function createSession(user: { id: string; role: Role; name: string }) {
  const token = await signSession({ uid: user.id, role: user.role, name: user.name });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
}

export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Reads the session and re-checks the user in the database (deactivated users lose access immediately). */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const payload = await verifySession(token);
  if (!payload) return null;
  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, payload.uid),
    with: { student: true, staff: true },
  });
  if (!user || !user.active) return null;
  return {
    id: user.id, email: user.email, name: user.name, role: user.role,
    studentId: user.student?.id, staffId: user.staff?.id, mustChangePassword: user.mustChangePassword,
  };
}

export async function requireStudent() {
  const u = await getCurrentUser();
  if (!u) redirect("/login?next=/student");
  if (u.role !== "STUDENT" || !u.studentId) redirect("/staff");
  if (u.mustChangePassword) redirect("/account/password?first=1");
  return u as CurrentUser & { studentId: string };
}

export async function requireStaff(cap: Capability = "dashboard.view") {
  const u = await getCurrentUser();
  if (!u) redirect("/login?next=/staff");
  if (u.role === "STUDENT") redirect("/student");
  if (u.mustChangePassword) redirect("/account/password?first=1");
  if (!can(u.role, cap)) redirect("/staff?denied=1");
  return u;
}

/** For server actions: throws instead of redirecting. */
export async function assertCan(cap: Capability) {
  const u = await getCurrentUser();
  if (!u || !can(u.role, cap)) throw new Error("You do not have permission to do that.");
  return u;
}
