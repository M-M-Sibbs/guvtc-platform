"use server";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { and, eq, gt, isNull } from "drizzle-orm";
import { z } from "zod";
import { db, schema as s } from "@/db";
import { createSession, destroySession, getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { queueAndSend, layout, p, button } from "@/lib/email";
import { appUrl } from "@/lib/app-url";

export type AuthState = { message?: string; ok?: boolean };
const MAX_FAILS = 5;
const LOCK_MIN = 15;
let dummyHash: string | null = null; // equalises timing for unknown emails

export async function login(_: AuthState, fd: FormData): Promise<AuthState> {
  if (!(await rateLimit("login", 20, 900))) return { message: "Too many sign-in attempts. Wait 15 minutes and try again." };
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const next = String(fd.get("next") ?? "");
  const user = await db.query.users.findFirst({ where: eq(s.users.email, email) });
  const generic = { message: "That email and password combination is not correct." };
  if (!user || !user.active) {
    dummyHash ??= await bcrypt.hash("not-a-real-password", 12);
    await bcrypt.compare(password, dummyHash);
    return generic;
  }
  if (user.lockedUntil && user.lockedUntil > new Date())
    return { message: `This account is locked after too many failed attempts. Try again after ${LOCK_MIN} minutes or reset your password.` };
  if (!(await bcrypt.compare(password, user.passwordHash))) {
    const fails = user.failedLogins + 1;
    await db.update(s.users).set({
      failedLogins: fails, lockedUntil: fails >= MAX_FAILS ? new Date(Date.now() + LOCK_MIN * 60000) : null,
    }).where(eq(s.users.id, user.id));
    if (fails >= MAX_FAILS) await audit({ id: user.id, name: user.name }, "auth.locked", "user", user.id);
    return generic;
  }
  await db.update(s.users).set({ failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() }).where(eq(s.users.id, user.id));
  await createSession(user);
  await audit({ id: user.id, name: user.name }, "auth.login", "user", user.id);
  const home = user.role === "STUDENT" ? "/student" : "/staff";
  const safeNext = next.startsWith(home) ? next : home;
  redirect(user.mustChangePassword ? "/account/password?first=1" : safeNext);
}

export async function logout() {
  await destroySession();
  redirect("/login?signed-out=1");
}

export async function requestPasswordReset(_: AuthState, fd: FormData): Promise<AuthState> {
  if (!(await rateLimit("reset", 5, 900))) return { message: "Too many requests. Try again later." };
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const user = await db.query.users.findFirst({ where: eq(s.users.email, email) });
  if (user?.active) {
    const token = randomBytes(32).toString("base64url");
    await db.insert(s.passwordResets).values({
      userId: user.id, tokenHash: createHash("sha256").update(token).digest("hex"), expiresAt: new Date(Date.now() + 60 * 60000),
    });
    const link = `${appUrl()}/reset-password?token=${token}`;
    await queueAndSend({
      to: user.email, subject: "Reset your GUVTC password",
      html: layout("Reset your password", p(`Hello ${user.name}, use the button below to choose a new password. The link works once and expires in 1 hour.`) + button("Choose a new password", link) + p("If you did not ask for this, you can ignore this email.")),
      text: `Reset your password (valid 1 hour): ${link}`, relatedType: "user", relatedId: user.id,
    });
  }
  return { ok: true, message: "If that email belongs to an account, a reset link is on its way. Check your inbox." };
}

const pw = z.string().min(10, "Use at least 10 characters").regex(/[A-Za-z]/, "Include a letter").regex(/[0-9]/, "Include a number");

export async function resetPassword(_: AuthState, fd: FormData): Promise<AuthState> {
  const token = String(fd.get("token") ?? "");
  const password = String(fd.get("password") ?? "");
  const check = pw.safeParse(password);
  if (!check.success) return { message: check.error.issues[0].message };
  if (password !== fd.get("confirm")) return { message: "The two passwords do not match." };
  const hash = createHash("sha256").update(token).digest("hex");
  const rec = await db.query.passwordResets.findFirst({ where: and(eq(s.passwordResets.tokenHash, hash), isNull(s.passwordResets.usedAt), gt(s.passwordResets.expiresAt, new Date())) });
  if (!rec) return { message: "This reset link is invalid or has expired. Request a new one." };
  await db.update(s.users).set({ passwordHash: await bcrypt.hash(password, 12), failedLogins: 0, lockedUntil: null, mustChangePassword: false }).where(eq(s.users.id, rec.userId));
  await db.update(s.passwordResets).set({ usedAt: new Date() }).where(eq(s.passwordResets.id, rec.id));
  await audit({ id: rec.userId, name: "self" }, "auth.password_reset", "user", rec.userId);
  return { ok: true, message: "Your password has been changed. You can now sign in." };
}

export async function changePassword(_: AuthState, fd: FormData): Promise<AuthState> {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  const user = await db.query.users.findFirst({ where: eq(s.users.id, me.id) });
  if (!user || !(await bcrypt.compare(String(fd.get("current") ?? ""), user.passwordHash))) return { message: "Your current password is not correct." };
  const password = String(fd.get("password") ?? "");
  const check = pw.safeParse(password);
  if (!check.success) return { message: check.error.issues[0].message };
  if (password !== fd.get("confirm")) return { message: "The two passwords do not match." };
  await db.update(s.users).set({ passwordHash: await bcrypt.hash(password, 12), mustChangePassword: false }).where(eq(s.users.id, me.id));
  await audit(me, "auth.password_change", "user", me.id);
  return { ok: true, message: "Password changed." };
}
