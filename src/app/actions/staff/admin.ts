"use server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema as s } from "@/db";
import { assertCan } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { back, fail, firstError, optStr, str, int, optDate, bool } from "@/lib/action-helpers";
import { retryFailed, deliver } from "@/lib/email";
import { SETTING_DEFAULTS } from "@/lib/settings";
import { CONFIGURABLE_FIELDS } from "@/schemas/application";
import { randomPasswordHash, createSetPasswordLink, sendWelcome } from "@/lib/accounts";
import { roleEnum, type Role } from "@/db/schema";
import { ROLE_LABELS } from "@/lib/permissions";
import { slugify } from "@/lib/utils";
import { collectUploads, publicUrl, UploadError } from "@/lib/storage";

// ── Inventory
export async function saveAsset(fd: FormData) {
  const me = await assertCan("inventory.manage");
  if (!str(fd, "code") || !str(fd, "name") || !str(fd, "location")) fail("/staff/inventory", "Code, name and location are required.");
  const cost = str(fd, "purchaseCost");
  const values = { code: str(fd, "code").toUpperCase(), name: str(fd, "name"), category: str(fd, "category") || "General", location: str(fd, "location"), department: str(fd, "department") || "General", condition: str(fd, "condition") || "Good", quantity: int(fd, "quantity") ?? 1, purchaseDate: optDate(fd, "purchaseDate"), purchaseCost: cost ? Number(cost).toFixed(2) : null, notes: optStr(fd, "notes") };
  const id = str(fd, "id");
  try {
    if (id) await db.update(s.inventoryAssets).set(values).where(eq(s.inventoryAssets.id, id));
    else await db.insert(s.inventoryAssets).values(values);
  } catch { fail("/staff/inventory", `Inventory code ${values.code} is already in use.`); }
  await audit(me, id ? "asset.update" : "asset.create", "inventory_asset", id || null, { code: values.code, condition: values.condition });
  back("/staff/inventory", "Asset saved.");
}

export async function addMaintenance(fd: FormData) {
  const me = await assertCan("inventory.manage");
  const assetId = str(fd, "assetId");
  if (!str(fd, "description")) fail("/staff/inventory", "Describe the maintenance.");
  const cost = str(fd, "cost");
  await db.insert(s.maintenanceRecords).values({ assetId, description: str(fd, "description"), performedBy: optStr(fd, "performedBy"), cost: cost ? Number(cost).toFixed(2) : null, date: optDate(fd, "date") ?? new Date() });
  if (str(fd, "condition")) await db.update(s.inventoryAssets).set({ condition: str(fd, "condition") }).where(eq(s.inventoryAssets.id, assetId));
  await audit(me, "asset.maintenance", "inventory_asset", assetId, { description: str(fd, "description") });
  back("/staff/inventory", "Maintenance recorded.");
}

// ── Announcements (institution-wide)
export async function postAnnouncement(fd: FormData) {
  const me = await assertCan("announcements.manage");
  if (!str(fd, "title") || !str(fd, "body")) fail("/staff/announcements", "Title and message are required.");
  const audience = str(fd, "audience") as "ALL_STUDENTS" | "STAFF" | "EVERYONE" | "COURSE";
  await db.insert(s.announcements).values({ title: str(fd, "title"), body: str(fd, "body"), audience, courseId: audience === "COURSE" ? optStr(fd, "courseId") : null, authorId: me.id });
  await audit(me, "announcement.create", "announcement", null, { title: str(fd, "title"), audience });
  back("/staff/announcements", "Announcement published.");
}

// ── Email log
export async function retryAll() {
  const me = await assertCan("notifications.manage");
  const n = await retryFailed();
  await audit(me, "email.retry_all", "notification", null, { n });
  back("/staff/notifications", `Retried ${n} message(s).`);
}
export async function retryOne(fd: FormData) {
  const me = await assertCan("notifications.manage");
  const id = str(fd, "id");
  await deliver(id);
  await audit(me, "email.retry", "notification", id);
  back("/staff/notifications", "Retry attempted.");
}

// ── Users & roles
export async function createStaffUser(fd: FormData) {
  const me = await assertCan("users.manage");
  const parsed = z.object({ name: z.string().min(3, "Name is required"), email: z.string().email("Valid email required"), role: z.enum(roleEnum.enumValues).refine((r) => r !== "STUDENT", "Use Students to create student accounts"), department: z.string().min(2, "Department is required") })
    .safeParse({ name: str(fd, "name"), email: str(fd, "email").toLowerCase(), role: str(fd, "role"), department: str(fd, "department") });
  if (!parsed.success) fail("/staff/users", firstError(parsed.error));
  const d = parsed.data!;
  if (await db.query.users.findFirst({ where: eq(s.users.email, d.email) })) fail("/staff/users", "That email already has an account.");
  const { user, link } = await db.transaction(async (tx) => {
    const [user] = await tx.insert(s.users).values({ email: d.email, name: d.name, role: d.role as Role, passwordHash: await randomPasswordHash() }).returning();
    const count = (await tx.select({ id: s.staff.id }).from(s.staff)).length;
    await tx.insert(s.staff).values({ userId: user.id, staffNumber: `ST-${String(count + 1).padStart(4, "0")}`, department: d.department, title: optStr(fd, "title"), showOnWebsite: bool(fd, "showOnWebsite") });
    return { user, link: await createSetPasswordLink(user.id, 7, tx) };
  });
  await sendWelcome({ to: user.email, name: user.name, link, staffRole: ROLE_LABELS[user.role] });
  await audit(me, "user.create", "user", user.id, { role: user.role });
  back("/staff/users", `Account created for ${user.name}. A set-password email has been sent.`);
}

export async function updateUserRole(fd: FormData) {
  const me = await assertCan("users.manage");
  const id = str(fd, "userId");
  if (id === me.id) fail("/staff/users", "You cannot change your own role or deactivate yourself.");
  const role = str(fd, "role") as Role;
  if (!roleEnum.enumValues.includes(role) || role === "STUDENT") fail("/staff/users", "Invalid role.");
  const active = str(fd, "active") === "true";
  const before = await db.query.users.findFirst({ where: eq(s.users.id, id) });
  await db.update(s.users).set({ role, active }).where(eq(s.users.id, id));
  await audit(me, "user.role", "user", id, { from: { role: before?.role, active: before?.active }, to: { role, active } });
  back("/staff/users", "User updated.");
}

export async function sendResetLink(fd: FormData) {
  const me = await assertCan("users.manage");
  const u = await db.query.users.findFirst({ where: eq(s.users.id, str(fd, "userId")) });
  if (!u) fail("/staff/users", "User not found");
  await sendWelcome({ to: u!.email, name: u!.name, link: await createSetPasswordLink(u!.id, 2), staffRole: ROLE_LABELS[u!.role] });
  await db.update(s.users).set({ failedLogins: 0, lockedUntil: null }).where(eq(s.users.id, u!.id));
  await audit(me, "user.reset_link", "user", u!.id);
  back("/staff/users", `Reset link sent to ${u!.email}.`);
}

// ── Settings
export async function saveSettings(fd: FormData) {
  const me = await assertCan("settings.manage");
  const keys = Object.keys(SETTING_DEFAULTS).filter((k) => k !== "application_required_fields" && k !== "grading_bands");
  for (const key of keys) {
    if (!fd.has(key)) continue;
    const value = str(fd, key);
    if ((key === "admissions_email" || key === "contact_email") && value && !z.string().email().safeParse(value).success) fail("/staff/settings", `${key.replace("_", " ")} must be a valid email address.`);
    await db.insert(s.settings).values({ key, value }).onConflictDoUpdate({ target: s.settings.key, set: { value, updatedAt: new Date() } });
  }
  const required = Object.keys(CONFIGURABLE_FIELDS).filter((k) => fd.get(`req_${k}`) === "on");
  await db.insert(s.settings).values({ key: "application_required_fields", value: JSON.stringify(required) }).onConflictDoUpdate({ target: s.settings.key, set: { value: JSON.stringify(required), updatedAt: new Date() } });
  await audit(me, "settings.update", "settings", null, { keys, required });
  revalidatePath("/", "layout");
  back("/staff/settings", "Settings saved.");
}

// ── Enquiries
export async function setEnquiryStatus(fd: FormData) {
  const me = await assertCan("enquiries.manage");
  const id = str(fd, "id");
  const status = str(fd, "status") as "NEW" | "RESPONDED" | "CLOSED";
  await db.update(s.enquiries).set({ status }).where(eq(s.enquiries.id, id));
  await audit(me, "enquiry.status", "enquiry", id, { status });
  back("/staff/enquiries", "Enquiry updated.");
}

// ── News, events & gallery
export async function saveNews(fd: FormData) {
  const me = await assertCan("news.manage");
  if (!str(fd, "title") || !str(fd, "excerpt") || !str(fd, "body")) fail("/staff/news", "Title, summary and body are required.");
  const id = str(fd, "id");
  let imageUrl = optStr(fd, "existingImage");
  try {
    const [img] = await collectUploads(fd, "image", "public/news", "image", 1);
    if (img) imageUrl = publicUrl(img.key);
  } catch (e) { if (e instanceof UploadError) fail("/staff/news", e.message); throw e; }
  const published = bool(fd, "published");
  const values = { title: str(fd, "title"), excerpt: str(fd, "excerpt"), body: str(fd, "body"), kind: str(fd, "kind") as "NEWS", eventDate: optDate(fd, "eventDate"), location: optStr(fd, "location"), registrable: bool(fd, "registrable"), published, imageUrl };
  if (id) {
    const prev = await db.query.newsPosts.findFirst({ where: eq(s.newsPosts.id, id) });
    await db.update(s.newsPosts).set({ ...values, publishedAt: published ? prev?.publishedAt ?? new Date() : null }).where(eq(s.newsPosts.id, id));
  } else {
    let slug = slugify(values.title);
    if (await db.query.newsPosts.findFirst({ where: eq(s.newsPosts.slug, slug) })) slug = `${slug}-${Date.now().toString(36)}`;
    await db.insert(s.newsPosts).values({ ...values, slug, publishedAt: published ? new Date() : null });
  }
  await audit(me, id ? "news.update" : "news.create", "news", id || null, { title: values.title, published });
  revalidatePath("/", "layout");
  back("/staff/news", "Saved.");
}

export async function saveGalleryItem(fd: FormData) {
  const me = await assertCan("news.manage");
  if (!str(fd, "title")) fail("/staff/news?tab=gallery", "Title is required.");
  if (!bool(fd, "consent")) fail("/staff/news?tab=gallery", "Confirm that permission has been recorded before publishing student work.");
  let imageUrl: string | null = null;
  try {
    const [img] = await collectUploads(fd, "image", "public/gallery", "image", 1);
    if (img) imageUrl = publicUrl(img.key);
  } catch (e) { if (e instanceof UploadError) fail("/staff/news?tab=gallery", e.message); throw e; }
  await db.insert(s.galleryItems).values({ title: str(fd, "title"), category: str(fd, "category") || "General", caption: optStr(fd, "caption"), imageUrl, consent: true });
  await audit(me, "gallery.create", "gallery", null, { title: str(fd, "title") });
  revalidatePath("/", "layout");
  back("/staff/news?tab=gallery", "Added to the gallery.");
}

export async function toggleGalleryItem(fd: FormData) {
  const me = await assertCan("news.manage");
  const id = str(fd, "id");
  await db.update(s.galleryItems).set({ published: str(fd, "published") === "true" }).where(eq(s.galleryItems.id, id));
  await audit(me, "gallery.toggle", "gallery", id);
  revalidatePath("/", "layout");
  back("/staff/news?tab=gallery", "Updated.");
}
