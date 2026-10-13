"use server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema as s } from "@/db";
import { assertCan } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import { collectUploads, publicUrl, UploadError } from "@/lib/storage";
import { back, fail, firstError, optDate, optStr, str, bool, int } from "@/lib/action-helpers";
import { slugify } from "@/lib/utils";
import { adPlacementEnum } from "@/db/schema";

const adSchema = z.object({
  title: z.string().min(3, "Title is required").max(120),
  ctaText: z.string().min(2, "Button text is required").max(40),
  ctaUrl: z.string().refine((u) => (u.startsWith("/") && !u.startsWith("//")) || /^https:\/\//.test(u), "Link must start with / or https://"),
  placement: z.enum(adPlacementEnum.enumValues),
});

export async function saveAdvert(fd: FormData) {
  const me = await assertCan("ads.manage");
  const id = str(fd, "id");
  const path = id ? `/staff/adverts/${id}` : "/staff/adverts/new";
  const parsed = adSchema.safeParse({ title: str(fd, "title"), ctaText: str(fd, "ctaText"), ctaUrl: str(fd, "ctaUrl"), placement: str(fd, "placement") });
  if (!parsed.success) fail(path, firstError(parsed.error));
  const startsAt = optDate(fd, "startsAt"), expiresAt = optDate(fd, "expiresAt");
  if (startsAt && expiresAt && expiresAt <= startsAt) fail(path, "The expiry date must be after the start date.");

  let imageUrl = optStr(fd, "existingImage");
  try {
    const [img] = await collectUploads(fd, "image", "public/ads", "image", 1);
    if (img) imageUrl = publicUrl(img.key);
  } catch (e) { if (e instanceof UploadError) fail(path, e.message); throw e; }
  if (bool(fd, "removeImage")) imageUrl = null;

  const values = {
    title: parsed.data!.title, subtitle: optStr(fd, "subtitle"), description: optStr(fd, "description"),
    ctaText: parsed.data!.ctaText, ctaUrl: parsed.data!.ctaUrl, placement: parsed.data!.placement,
    courseId: optStr(fd, "courseId"), category: optStr(fd, "category"), theme: str(fd, "theme") || "navy",
    videoUrl: optStr(fd, "videoUrl"), imageUrl,
    highlightCourses: str(fd, "highlightCourses").split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 10),
    pinned: bool(fd, "pinned"), priority: int(fd, "priority") ?? 0,
    startsAt, expiresAt, intakeStart: optDate(fd, "intakeStart"), applicationDeadline: optDate(fd, "applicationDeadline"),
    updatedAt: new Date(),
  };

  let adId = id;
  if (id) {
    const existing = await db.query.advertisements.findFirst({ where: eq(s.advertisements.id, id) });
    if (!existing) fail("/staff/adverts", "Advert not found");
    // Editing a published advert sends it back for approval unless the editor can approve.
    const status = existing!.status === "PUBLISHED" && !can(me.role, "ads.approve") ? "PENDING_APPROVAL" : existing!.status;
    await db.update(s.advertisements).set({ ...values, status }).where(eq(s.advertisements.id, id));
    await audit(me, "advert.update", "advertisement", id, { title: values.title, status });
  } else {
    let slug = slugify(values.title);
    if (await db.query.advertisements.findFirst({ where: eq(s.advertisements.slug, slug) })) slug = `${slug}-${Date.now().toString(36)}`;
    const [row] = await db.insert(s.advertisements).values({ ...values, slug, status: "DRAFT", createdById: me.id }).returning();
    adId = row.id;
    await audit(me, "advert.create", "advertisement", row.id, { title: values.title });
  }
  revalidatePath("/", "layout");
  back(`/staff/adverts/${adId}`, "Advert saved.");
}

type Transition = "submit" | "approve" | "reject" | "archive" | "unpublish" | "restore";

export async function transitionAdvert(fd: FormData) {
  const id = str(fd, "id");
  const action = str(fd, "action") as Transition;
  const needsApprove = action === "approve" || action === "reject";
  const me = await assertCan(needsApprove ? "ads.approve" : "ads.manage");
  const ad = await db.query.advertisements.findFirst({ where: eq(s.advertisements.id, id) });
  if (!ad) fail("/staff/adverts", "Advert not found");
  const next = {
    submit: "PENDING_APPROVAL", approve: "PUBLISHED", reject: "REJECTED", archive: "ARCHIVED", unpublish: "DRAFT", restore: "DRAFT",
  }[action] as typeof ad.status;
  if (!next) fail(`/staff/adverts/${id}`, "Unknown action");
  await db.update(s.advertisements).set({
    status: next, updatedAt: new Date(),
    ...(action === "approve" ? { approvedById: me.id, rejectionNote: null } : {}),
    ...(action === "reject" ? { rejectionNote: optStr(fd, "note") ?? "Rejected" } : {}),
  }).where(eq(s.advertisements.id, id));
  await audit(me, `advert.${action}`, "advertisement", id, { from: ad!.status, to: next });
  revalidatePath("/", "layout");
  back(`/staff/adverts/${id}`, { submit: "Sent for approval.", approve: "Approved and published.", reject: "Advert rejected.", archive: "Archived.", unpublish: "Moved back to draft.", restore: "Restored to draft." }[action]);
}

export async function duplicateAdvert(fd: FormData) {
  const me = await assertCan("ads.manage");
  const ad = await db.query.advertisements.findFirst({ where: eq(s.advertisements.id, str(fd, "id")) });
  if (!ad) fail("/staff/adverts", "Advert not found");
  const { id: _id, slug, clicks: _c, impressions: _i, createdAt: _ca, updatedAt: _u, approvedById: _a, rejectionNote: _r, ...rest } = ad!;
  const [row] = await db.insert(s.advertisements).values({ ...rest, title: `${ad!.title} (copy)`, slug: `${slug}-${Date.now().toString(36)}`, status: "DRAFT", pinned: false, createdById: me.id }).returning();
  await audit(me, "advert.duplicate", "advertisement", row.id, { from: ad!.id });
  back(`/staff/adverts/${row.id}`, "Copy created as a draft.");
}
