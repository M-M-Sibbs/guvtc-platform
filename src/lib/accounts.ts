import "server-only";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import { like, desc } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { queueAndSend, layout, p, button, kv } from "./email";
import { appUrl } from "@/lib/app-url";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function nextStudentNumber(tx: Tx | typeof db = db) {
  const yy = String(new Date().getFullYear()).slice(2);
  const prefix = `GUV${yy}`;
  const [last] = await tx.select({ n: s.students.studentNumber }).from(s.students).where(like(s.students.studentNumber, `${prefix}%`)).orderBy(desc(s.students.studentNumber)).limit(1);
  const seq = last ? Number(last.n.slice(prefix.length)) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, "0")}`;
}

/** Accounts are created with an unusable random password; the person sets their own via a one-time link. */
export async function randomPasswordHash() {
  return bcrypt.hash(randomBytes(24).toString("base64url"), 12);
}

export async function createSetPasswordLink(userId: string, days = 7, tx: Tx | typeof db = db) {
  const token = randomBytes(32).toString("base64url");
  await tx.insert(s.passwordResets).values({ userId, tokenHash: createHash("sha256").update(token).digest("hex"), expiresAt: new Date(Date.now() + days * 86400000) });
  return `${appUrl()}/reset-password?token=${token}`;
}

export async function sendWelcome(opts: { to: string; name: string; link: string; studentNumber?: string; course?: string; staffRole?: string }) {
  const rows: [string, string][] = [["Sign-in email", opts.to]];
  if (opts.studentNumber) rows.push(["Student number", opts.studentNumber]);
  if (opts.course) rows.push(["Course", opts.course]);
  if (opts.staffRole) rows.push(["Role", opts.staffRole]);
  await queueAndSend({
    to: opts.to,
    subject: opts.studentNumber ? "Welcome to GUVTC — set up your eLearning account" : "Your GUVTC staff account",
    html: layout(`Welcome, ${opts.name}`, p(opts.studentNumber ? "You are enrolled. Your eLearning account gives you access to lessons, notes, assignments and your published results." : "A staff account has been created for you on the GUVTC digital campus.") + kv(rows) + button("Set your password", opts.link) + p("This link works once and expires in 7 days.")),
    text: `Welcome ${opts.name}. Set your password: ${opts.link}`,
    relatedType: "user",
  });
}
