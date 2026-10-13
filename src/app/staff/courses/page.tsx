import Link from "next/link";
import { asc } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { requireStaff } from "@/lib/auth";
import { PortalTitle } from "@/components/portal/portal-shell";
import { StatusBadge } from "@/components/ui/ui";
import { Flash } from "@/components/staff/flash";
import { setCourseStatus, saveCategory } from "@/app/actions/staff/courses";
import { SubmitButton } from "@/components/ui/submit-button";

export const metadata = { title: "Courses & intakes" };

export default async function CoursesAdmin({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireStaff("courses.manage");
  const cats = await db.query.courseCategories.findMany({ orderBy: asc(s.courseCategories.sortOrder), with: { courses: { orderBy: asc(s.courses.sortOrder), with: { intakes: true } } } });
  return (
    <>
      <PortalTitle title="Courses & intakes" lead="The public catalogue is built from these records. Open or close enrolment, edit durations and add intakes without touching code.">
        <Link href="/staff/courses/new" className="btn btn-primary">New course</Link>
      </PortalTitle>
      <Flash searchParams={searchParams} />
      <div className="space-y-6">
        {cats.map((c) => (
          <section key={c.id} className="panel overflow-hidden">
            <h2 className="border-b border-line bg-mist-2 px-5 py-3 font-display text-lg font-semibold">{c.name}</h2>
            <table className="table-std">
              <thead><tr><th>Course</th><th>Duration</th><th>Open intakes</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {c.courses.map((co) => (
                  <tr key={co.id}>
                    <td><Link href={`/staff/courses/${co.id}`} className="font-semibold hover:underline">{co.name}</Link></td>
                    <td className={co.durationText ? "" : "text-warn"}>{co.durationText ?? "Not set — confirm"}</td>
                    <td>{co.intakes.filter((i) => i.status === "OPEN" && i.startDate > new Date()).length}</td>
                    <td><StatusBadge status={co.status} /></td>
                    <td className="text-right">
                      <form action={setCourseStatus} className="inline"><input type="hidden" name="id" value={co.id} /><input type="hidden" name="status" value={co.status === "OPEN" ? "CLOSED" : "OPEN"} />
                        <button className="btn btn-outline btn-sm">{co.status === "OPEN" ? "Close enrolment" : "Open enrolment"}</button></form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </div>
      <section className="panel mt-6 p-5">
        <h2 className="font-display text-lg font-semibold">Add a department</h2>
        <form action={saveCategory} className="mt-3 grid gap-3 md:grid-cols-[1fr_1.5fr_auto_auto] md:items-end">
          <div><label className="field-label" htmlFor="cat-name">Name</label><input id="cat-name" name="name" className="input" /></div>
          <div><label className="field-label" htmlFor="cat-desc">Short description</label><input id="cat-desc" name="description" className="input" /></div>
          <label className="flex items-center gap-2 pb-3 text-sm"><input type="checkbox" name="isAI" className="accent-navy" />AI department</label>
          <SubmitButton>Add</SubmitButton>
        </form>
      </section>
    </>
  );
}
