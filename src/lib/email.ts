import "server-only";
import nodemailer from "nodemailer";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { and, eq, lt } from "drizzle-orm";
import { db, schema } from "@/db";
import { getSettings } from "./settings";

/**
 * Email service. Every message is first stored in `notifications`, then sent from the server,
 * so delivery never depends on the applicant's browser. Failures stay in the log with the
 * error and can be retried from Staff → Email log, or by the scheduled job (/api/jobs).
 *
 * Transport: set SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS (works with Resend, Postmark, Gmail
 * Workspace, Microsoft 365 or the government mail relay). Without SMTP_HOST, messages are
 * written to ./storage/outbox as .html files — development only.
 */
export const MAX_ATTEMPTS = 5;

export function emailMode() {
  return process.env.SMTP_HOST ? "smtp" : process.env.VERCEL ? "off" : "outbox";
}

/** Plain-language warning for staff when email is not being delivered, or null when it is. */
export function emailWarning() {
  const m = emailMode();
  if (m === "off") return "Email is not set up yet: no messages are being delivered. Add the SMTP settings in Vercel (Settings → Environment Variables), redeploy, then use Email log → Retry failed.";
  if (m === "outbox") return "Development mode: no SMTP server is configured, so emails are saved to storage/outbox on this server instead of being delivered.";
  return null;
}

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;
function getTransport() {
  if (!process.env.SMTP_HOST) return null;
  transporter ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  return transporter;
}

type Mail = { to: string; subject: string; html: string; text: string; relatedType?: string; relatedId?: string };

export async function queueAndSend(mail: Mail) {
  const [row] = await db.insert(schema.notifications).values({ ...mail }).returning();
  await deliver(row.id);
  return row.id;
}

export async function deliver(notificationId: string) {
  const n = await db.query.notifications.findFirst({ where: eq(schema.notifications.id, notificationId) });
  if (!n || n.status === "SENT") return;
  const settings = await getSettings();
  try {
    const t = getTransport();
    if (t) {
      await t.sendMail({ from: settings.sender_email, to: n.to, subject: n.subject, html: n.html, text: n.text });
    } else if (process.env.VERCEL) {
      // Vercel has no writable disk: keep the message as FAILED so it is sent by "Retry failed" once SMTP is configured.
      throw new Error("Email is not configured: add SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_PASS in Vercel → Settings → Environment Variables, then redeploy and retry.");
    } else {
      const dir = path.resolve(process.env.STORAGE_DIR ?? "./storage", "outbox");
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, `${Date.now()}-${n.id}.html`),
        `<!-- To: ${n.to}\nSubject: ${n.subject} -->\n${n.html}`);
    }
    await db.update(schema.notifications)
      .set({ status: "SENT", sentAt: new Date(), attempts: n.attempts + 1, lastError: null })
      .where(eq(schema.notifications.id, n.id));
  } catch (e) {
    await db.update(schema.notifications)
      .set({ status: "FAILED", attempts: n.attempts + 1, lastError: (e as Error).message.slice(0, 500) })
      .where(eq(schema.notifications.id, n.id));
  }
}

/** Retries failed / stuck messages. Called by the job endpoint and the staff "Retry failed" button. */
export async function retryFailed() {
  const pending = await db.select({ id: schema.notifications.id }).from(schema.notifications)
    .where(and(eq(schema.notifications.status, "FAILED"), lt(schema.notifications.attempts, MAX_ATTEMPTS)));
  for (const p of pending) await deliver(p.id);
  return pending.length;
}

// ───────────── Templates ─────────────
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function layout(title: string, bodyHtml: string, institution = "Gweru Urban Vocational Training Centre") {
  return `<!doctype html><html><body style="margin:0;background:#EAF0F6;font-family:Arial,Helvetica,sans-serif;color:#102A43">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:6px;overflow:hidden">
<tr><td style="background:#102A43;padding:20px 28px;color:#fff">
<div style="font-family:Georgia,serif;font-size:20px">${esc(institution)}</div>
<div style="height:3px;width:48px;background:#D9B56D;margin-top:10px"></div></td></tr>
<tr><td style="padding:28px">
<h1 style="font-family:Georgia,serif;font-size:22px;margin:0 0 16px">${esc(title)}</h1>
${bodyHtml}
</td></tr>
<tr><td style="padding:16px 28px;background:#F7F9FB;font-size:12px;color:#486581">
This message was sent by ${esc(institution)}. Please do not share your reference number or login details with anyone who is not GUVTC staff.
</td></tr></table></td></tr></table></body></html>`;
}

export function kv(rows: [string, string][]) {
  return `<table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:12px 0 20px">${rows
    .map(([k, v]) => `<tr><td style="padding:8px 0;border-bottom:1px solid #E4E9F0;color:#486581;width:40%">${esc(k)}</td><td style="padding:8px 0;border-bottom:1px solid #E4E9F0;font-weight:bold">${esc(v)}</td></tr>`)
    .join("")}</table>`;
}

export function p(text: string) {
  return `<p style="line-height:1.6;margin:0 0 14px">${esc(text)}</p>`;
}

export function button(label: string, href: string) {
  return `<p style="margin:20px 0"><a href="${esc(href)}" style="background:#102A43;color:#fff;padding:12px 20px;border-radius:4px;text-decoration:none;font-weight:bold">${esc(label)}</a></p>`;
}

export { esc };
