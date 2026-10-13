import { desc, eq, inArray, or } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { requireStudent } from "@/lib/auth";
import { accessibleCourseIds } from "@/lib/student-data";
import { PortalTitle } from "@/components/portal/portal-shell";
import { fmtDateTime } from "@/lib/utils";

export const metadata = { title: "Notices" };

export default async function NoticesPage() {
  const me = await requireStudent();
  const ids = await accessibleCourseIds(me.studentId);
  const items = await db.query.announcements.findMany({
    where: or(eq(s.announcements.audience, "ALL_STUDENTS"), eq(s.announcements.audience, "EVERYONE"), ids.length ? inArray(s.announcements.courseId, ids) : undefined),
    with: { course: true, author: true }, orderBy: desc(s.announcements.publishedAt),
  });
  return (
    <>
      <PortalTitle title="Notices" lead="Announcements from your lecturers and the centre." />
      <ul className="space-y-4">
        {items.map((n) => (
          <li key={n.id} className="panel p-5">
            <p className="text-sm text-slate">{n.course?.name ?? "All students"} · {n.author?.name ?? "GUVTC"} · {fmtDateTime(n.publishedAt)}</p>
            <h2 className="mt-1 font-display text-xl font-semibold">{n.title}</h2>
            <p className="mt-2 whitespace-pre-line">{n.body}</p>
          </li>
        ))}
      </ul>
    </>
  );
}
