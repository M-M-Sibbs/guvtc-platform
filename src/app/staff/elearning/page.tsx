import Link from "next/link";
import { asc, inArray } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { requireStaff } from "@/lib/auth";
import { teachableCourseIds } from "@/lib/teaching";
import { PortalTitle } from "@/components/portal/portal-shell";
import { Flash } from "@/components/staff/flash";
import { EmptyState } from "@/components/ui/ui";

export const metadata = { title: "eLearning content" };

export default async function ElearningIndex({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const me = await requireStaff("elearning.manage");
  const ids = await teachableCourseIds(me);
  const courses = ids === "all" || ids.length
    ? await db.query.courses.findMany({ where: ids === "all" ? undefined : inArray(s.courses.id, ids), orderBy: asc(s.courses.name), with: { modules: { with: { lessons: true } }, assignments: true, enrolments: true } })
    : [];
  return (
    <>
      <PortalTitle title="eLearning content" lead="Modules, live and recorded lessons, notes, assignments and quizzes for the courses you teach." />
      <Flash searchParams={searchParams} />
      {courses.length === 0 ? <EmptyState title="No courses assigned to you" body="The registrar assigns lecturers to class groups. Once you are assigned, your courses appear here." /> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {courses.map((c) => (
            <Link key={c.id} href={`/staff/elearning/${c.id}`} className="panel p-5 hover:border-navy">
              <p className="font-display text-xl font-semibold">{c.name}</p>
              <p className="mt-1 text-sm text-slate">{c.modules.length} modules · {c.modules.reduce((t, m) => t + m.lessons.length, 0)} lessons · {c.assignments.length} assignments · {c.enrolments.length} students</p>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
