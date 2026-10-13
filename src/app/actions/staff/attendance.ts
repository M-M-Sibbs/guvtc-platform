"use server";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { assertCan } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { back, fail, str } from "@/lib/action-helpers";

export async function saveRegister(fd: FormData) {
  const me = await assertCan("attendance.record");
  const classGroupId = str(fd, "classGroupId");
  const date = str(fd, "date");
  const ret = `/staff/attendance?class=${classGroupId}&date=${date}`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) fail(ret, "Choose a valid date.");
  const group = await db.query.classGroups.findFirst({ where: eq(s.classGroups.id, classGroupId), with: { enrolments: true } });
  if (!group) fail("/staff/attendance", "Class not found");
  if (me.role === "LECTURER" && group!.lecturerId !== me.staffId) fail("/staff/attendance", "You can only take registers for your own classes.");
  let n = 0;
  for (const e of group!.enrolments) {
    const status = str(fd, `s_${e.studentId}`) as "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
    if (!["PRESENT", "ABSENT", "LATE", "EXCUSED"].includes(status)) continue;
    await db.insert(s.attendance).values({ studentId: e.studentId, classGroupId, date, status, recordedById: me.id })
      .onConflictDoUpdate({ target: [s.attendance.studentId, s.attendance.classGroupId, s.attendance.date], set: { status, recordedById: me.id } });
    n++;
  }
  await audit(me, "attendance.register", "class_group", classGroupId, { date, records: n });
  back(ret, `Register saved for ${n} students.`);
}
