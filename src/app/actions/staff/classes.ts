"use server";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { assertCan } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { back, fail, optStr, str, int } from "@/lib/action-helpers";
import { findConflicts, validTimes, type Slot } from "@/lib/timetable";

const DAYS = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export async function saveClassGroup(fd: FormData) {
  const me = await assertCan("classes.manage");
  if (!str(fd, "name") || !str(fd, "courseId")) fail("/staff/classes", "Class name and course are required.");
  const values = { name: str(fd, "name"), courseId: str(fd, "courseId"), lecturerId: optStr(fd, "lecturerId"), room: optStr(fd, "room"), capacity: int(fd, "capacity") };
  const id = str(fd, "id");
  if (id) await db.update(s.classGroups).set(values).where(eq(s.classGroups.id, id));
  else await db.insert(s.classGroups).values(values);
  await audit(me, id ? "class.update" : "class.create", "class_group", id || null, values);
  back("/staff/classes", "Class saved.");
}

async function allSlots(): Promise<Slot[]> {
  const rows = await db.select({ slot: s.timetableSlots, lecturerId: s.classGroups.lecturerId, name: s.classGroups.name })
    .from(s.timetableSlots).innerJoin(s.classGroups, eq(s.timetableSlots.classGroupId, s.classGroups.id));
  return rows.map((r) => ({ ...r.slot, lecturerId: r.lecturerId, label: r.name }));
}

export async function addSlot(fd: FormData) {
  const me = await assertCan("classes.manage");
  const classGroupId = str(fd, "classGroupId");
  const group = await db.query.classGroups.findFirst({ where: eq(s.classGroups.id, classGroupId) });
  if (!group) fail("/staff/classes", "Class not found");
  const slot: Slot = { classGroupId, dayOfWeek: int(fd, "dayOfWeek") ?? 1, startTime: str(fd, "startTime"), endTime: str(fd, "endTime"), room: optStr(fd, "room") ?? group!.room, lecturerId: group!.lecturerId };
  if (!validTimes(slot.startTime, slot.endTime)) fail("/staff/classes", "End time must be after start time.");
  const clashes = findConflicts(slot, await allSlots());
  if (clashes.length && fd.get("force") !== "on") {
    fail("/staff/classes", `Clash on ${DAYS[slot.dayOfWeek]} ${slot.startTime}–${slot.endTime} with ${clashes.map((c) => `${c.label} (${c.startTime}–${c.endTime}, ${c.room ?? "no room"})`).join("; ")}. Tick “Save anyway” to override.`);
  }
  await db.insert(s.timetableSlots).values({ ...slot, activity: str(fd, "activity") || "Lesson" });
  await audit(me, "timetable.add", "class_group", classGroupId, { ...slot, overridden: clashes.length > 0 });
  back("/staff/classes", clashes.length ? "Saved with a clash (override recorded)." : "Timetable slot added.");
}

export async function deleteSlot(fd: FormData) {
  const me = await assertCan("classes.manage");
  const id = str(fd, "id");
  await db.delete(s.timetableSlots).where(eq(s.timetableSlots.id, id));
  await audit(me, "timetable.delete", "timetable_slot", id);
  back("/staff/classes", "Slot removed.");
}
