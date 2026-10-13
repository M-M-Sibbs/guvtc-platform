"use server";
import { z } from "zod";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { rateLimit } from "@/lib/rate-limit";
import { queueAndSend, layout, kv, p } from "@/lib/email";
import { getSettings } from "@/lib/settings";
import { fmtDateTime } from "@/lib/utils";

export type FormState = { ok?: boolean; message?: string; errors?: Record<string, string> };

const enquirySchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(120),
  email: z.string().trim().email("Enter a valid email address"),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  courseId: z.string().optional().or(z.literal("")),
  message: z.string().trim().min(5, "Tell us what you would like to know").max(2000),
  consent: z.literal("on", { message: "Please agree so we can reply to you" }),
  source: z.string().max(40).optional(),
});

function fieldErrors(e: z.ZodError) {
  const out: Record<string, string> = {};
  for (const i of e.issues) out[i.path.join(".")] ??= i.message;
  return out;
}

export async function submitEnquiry(_: FormState, fd: FormData): Promise<FormState> {
  if (fd.get("website")) return { ok: true, message: "Thank you." }; // honeypot
  if (!(await rateLimit("enquiry", 5, 600))) return { message: "Too many enquiries from this connection. Try again in 10 minutes." };
  const parsed = enquirySchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const d = parsed.data;
  const adId = (await cookies()).get("guvtc_ad")?.value;
  const course = d.courseId ? await db.query.courses.findFirst({ where: eq(s.courses.id, d.courseId) }) : null;
  const [row] = await db.insert(s.enquiries).values({
    name: d.name, email: d.email, phone: d.phone || null, courseId: course?.id ?? null, message: d.message,
    consent: true, source: d.source ?? "contact-form", adId: adId ?? null,
  }).returning();
  const settings = await getSettings();
  await queueAndSend({
    to: settings.admissions_email,
    subject: `New enquiry${course ? `: ${course.name}` : ""} — ${d.name}`,
    html: layout("New website enquiry", kv([["Name", d.name], ["Email", d.email], ["Phone", d.phone || "—"], ["Course", course?.name ?? "General"], ["Received", fmtDateTime(new Date())]]) + p(d.message)),
    text: `Enquiry from ${d.name} (${d.email}, ${d.phone || "no phone"})\nCourse: ${course?.name ?? "General"}\n\n${d.message}`,
    relatedType: "enquiry", relatedId: row.id,
  });
  return { ok: true, message: "Thank you — your enquiry has been sent to Admissions. We usually reply within two working days." };
}

const regSchema = z.object({
  newsId: z.string().min(1),
  name: z.string().trim().min(2, "Enter your name").max(120),
  email: z.string().trim().email("Enter a valid email address"),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
});

export async function registerForEvent(_: FormState, fd: FormData): Promise<FormState> {
  if (!(await rateLimit("event", 5, 600))) return { message: "Too many attempts. Try again later." };
  const parsed = regSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const d = parsed.data;
  const ev = await db.query.newsPosts.findFirst({ where: eq(s.newsPosts.id, d.newsId) });
  if (!ev || !ev.registrable || !ev.published) return { message: "Registration is not open for this event." };
  await db.insert(s.eventRegistrations).values({ newsId: ev.id, name: d.name, email: d.email, phone: d.phone || null });
  await queueAndSend({
    to: d.email, subject: `You're registered: ${ev.title}`,
    html: layout("Registration confirmed", p(`Hello ${d.name}, you are registered for:`) + kv([["Event", ev.title], ["Date", fmtDateTime(ev.eventDate)], ["Venue", ev.location ?? "GUVTC"]]) + p("If you can no longer attend, simply reply to let us know.")),
    text: `You are registered for ${ev.title} on ${fmtDateTime(ev.eventDate)} at ${ev.location ?? "GUVTC"}.`,
    relatedType: "event", relatedId: ev.id,
  });
  return { ok: true, message: "You're registered. A confirmation email is on its way." };
}
