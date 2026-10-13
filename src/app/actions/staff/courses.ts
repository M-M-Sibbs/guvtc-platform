"use server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { assertCan } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { back, fail, optStr, str, int, optDate } from "@/lib/action-helpers";
import { slugify } from "@/lib/utils";
import type { Faq } from "@/db/schema";

const lines = (v: string) => v.split("\n").map((x) => x.trim()).filter(Boolean);

function parseFaqs(v: string): Faq[] {
  // Format: "Q: question" newline "A: answer", blank line between entries
  return v.split(/\n\s*\n/).map((block) => {
    const q = block.match(/^Q:\s*(.+)$/m)?.[1]?.trim();
    const a = block.match(/^A:\s*([\s\S]+)$/m)?.[1]?.trim();
    return q && a ? { q, a } : null;
  }).filter((x): x is Faq => !!x);
}

export async function saveCourse(fd: FormData) {
  const me = await assertCan("courses.manage");
  const id = str(fd, "id");
  const path = id ? `/staff/courses/${id}` : "/staff/courses/new";
  const name = str(fd, "name");
  if (name.length < 3) fail(path, "Course name is required.");
  if (!str(fd, "categoryId")) fail(path, "Choose a department.");
  if (str(fd, "summary").length < 10) fail(path, "Add a one-line summary (at least 10 characters).");
  const values = {
    name, categoryId: str(fd, "categoryId"), summary: str(fd, "summary"), description: str(fd, "description") || str(fd, "summary"),
    outcomes: lines(str(fd, "outcomes")), durationText: optStr(fd, "durationText"), durationWeeks: int(fd, "durationWeeks"),
    deliveryModes: fd.getAll("deliveryModes").map(String), entryRequirements: optStr(fd, "entryRequirements"),
    equipment: optStr(fd, "equipment"), feesText: optStr(fd, "feesText"),
    status: (str(fd, "status") || "DRAFT") as "OPEN" | "CLOSED" | "DRAFT", featured: fd.get("featured") === "on",
    faqs: parseFaqs(str(fd, "faqs")), videoUrl: optStr(fd, "videoUrl"), updatedAt: new Date(),
  };
  if (!values.deliveryModes.length) values.deliveryModes = ["IN_PERSON"];
  let courseId = id;
  if (id) {
    await db.update(s.courses).set(values).where(eq(s.courses.id, id));
    await audit(me, "course.update", "course", id, { name, status: values.status });
  } else {
    let slug = slugify(name);
    if (await db.query.courses.findFirst({ where: eq(s.courses.slug, slug) })) slug = `${slug}-${Date.now().toString(36)}`;
    const [row] = await db.insert(s.courses).values({ ...values, slug }).returning();
    courseId = row.id;
    await audit(me, "course.create", "course", row.id, { name });
  }
  revalidatePath("/", "layout");
  back(`/staff/courses/${courseId}`, "Course saved.");
}

export async function setCourseStatus(fd: FormData) {
  const me = await assertCan("courses.manage");
  const id = str(fd, "id");
  const status = str(fd, "status") as "OPEN" | "CLOSED" | "DRAFT";
  await db.update(s.courses).set({ status, updatedAt: new Date() }).where(eq(s.courses.id, id));
  await audit(me, "course.status", "course", id, { status });
  revalidatePath("/", "layout");
  back(str(fd, "returnTo") || "/staff/courses", `Enrolment ${status === "OPEN" ? "opened" : status === "CLOSED" ? "closed" : "set to draft"}.`);
}

export async function saveIntake(fd: FormData) {
  const me = await assertCan("courses.manage");
  const courseId = str(fd, "courseId");
  const path = `/staff/courses/${courseId}`;
  const startDate = optDate(fd, "startDate");
  if (!str(fd, "name") || !startDate) fail(path, "Intake name and start date are required.");
  const values = { courseId, name: str(fd, "name"), startDate: startDate!, applicationDeadline: optDate(fd, "applicationDeadline"), capacity: int(fd, "capacity"), status: (str(fd, "status") || "OPEN") as "OPEN" | "CLOSED" };
  const id = str(fd, "id");
  if (id) await db.update(s.intakes).set(values).where(eq(s.intakes.id, id));
  else await db.insert(s.intakes).values(values);
  await audit(me, id ? "intake.update" : "intake.create", "course", courseId, { name: values.name });
  revalidatePath("/", "layout");
  back(path, "Intake saved.");
}

export async function saveCategory(fd: FormData) {
  const me = await assertCan("courses.manage");
  const name = str(fd, "name");
  if (name.length < 3) fail("/staff/courses", "Department name is required.");
  await db.insert(s.courseCategories).values({ name, slug: slugify(name), description: optStr(fd, "description"), isAI: fd.get("isAI") === "on", sortOrder: 99 });
  await audit(me, "category.create", "course_category", null, { name });
  revalidatePath("/", "layout");
  back("/staff/courses", "Department added.");
}

export async function saveFeeItem(fd: FormData) {
  const me = await assertCan("finance.manage");
  const courseId = str(fd, "courseId");
  const amount = Number(str(fd, "amount"));
  if (!str(fd, "name") || !(amount >= 0)) fail(`/staff/courses/${courseId}`, "Fee name and amount are required.");
  await db.insert(s.feeItems).values({ courseId, name: str(fd, "name"), amount: amount.toFixed(2), currency: str(fd, "currency") || "USD" });
  await audit(me, "fee_item.create", "course", courseId, { name: str(fd, "name"), amount });
  back(`/staff/courses/${courseId}`, "Fee item added.");
}
