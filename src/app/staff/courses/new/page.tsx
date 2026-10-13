import { asc } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { requireStaff } from "@/lib/auth";
import { PortalTitle } from "@/components/portal/portal-shell";
import { CourseForm } from "@/components/staff/course-form";
import { Flash } from "@/components/staff/flash";

export default async function NewCourse({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireStaff("courses.manage");
  const cats = await db.select({ id: s.courseCategories.id, name: s.courseCategories.name }).from(s.courseCategories).orderBy(asc(s.courseCategories.sortOrder));
  return (<><PortalTitle title="New course" /><Flash searchParams={searchParams} /><CourseForm categories={cats} /></>);
}
