import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { PortalTitle } from "@/components/portal/portal-shell";
import { CourseForm } from "@/components/staff/course-form";
import { Flash } from "@/components/staff/flash";
import { StatusBadge } from "@/components/ui/ui";
import { SubmitButton } from "@/components/ui/submit-button";
import { saveIntake, saveFeeItem } from "@/app/actions/staff/courses";
import { fmtDate, fmtMoney, toLocalInput } from "@/lib/utils";

export default async function EditCourse({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  const me = await requireStaff("courses.manage");
  const { id } = await params;
  const [course, cats] = await Promise.all([
    db.query.courses.findFirst({ where: eq(s.courses.id, id), with: { intakes: { orderBy: asc(s.intakes.startDate) }, feeItems: true } }),
    db.select({ id: s.courseCategories.id, name: s.courseCategories.name }).from(s.courseCategories).orderBy(asc(s.courseCategories.sortOrder)),
  ]);
  if (!course) notFound();
  return (
    <>
      <Link href="/staff/courses" className="mb-3 inline-block text-sm underline">All courses</Link>
      <PortalTitle title={course.name} lead={<StatusBadge status={course.status} />}>
        <Link href={`/courses/${course.slug}`} target="_blank" className="btn btn-outline btn-sm">View public page</Link>
      </PortalTitle>
      <Flash searchParams={searchParams} />
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <CourseForm course={course} categories={cats} />
        <div className="space-y-6">
          <section className="panel p-5">
            <h2 className="font-display text-xl font-semibold">Intakes</h2>
            <ul className="mt-3 divide-y divide-line">
              {course.intakes.map((i) => (
                <li key={i.id} className="py-3">
                  <details>
                    <summary className="flex cursor-pointer items-center justify-between gap-2">
                      <span><span className="font-medium">{i.name}</span><span className="block text-xs text-slate">Starts {fmtDate(i.startDate)} · deadline {fmtDate(i.applicationDeadline)} · {i.capacity ?? "∞"} places</span></span>
                      <StatusBadge status={i.status} />
                    </summary>
                    <IntakeForm courseId={course.id} intake={i} />
                  </details>
                </li>
              ))}
            </ul>
            <details className="mt-3 rounded-md border border-dashed border-line p-3"><summary className="cursor-pointer font-medium">Add an intake</summary><IntakeForm courseId={course.id} /></details>
          </section>
          {can(me.role, "finance.manage") && (
            <section className="panel p-5">
              <h2 className="font-display text-xl font-semibold">Fee structure</h2>
              <ul className="mt-3 space-y-1 text-sm">{course.feeItems.map((f) => <li key={f.id} className="flex justify-between"><span>{f.name}</span><strong>{fmtMoney(f.amount, f.currency)}</strong></li>)}</ul>
              <form action={saveFeeItem} className="mt-4 grid grid-cols-[1fr_100px] gap-2">
                <input type="hidden" name="courseId" value={course.id} />
                <input name="name" placeholder="Fee item" className="input" /><input name="amount" type="number" step="0.01" placeholder="Amount" className="input" />
                <div className="col-span-2"><SubmitButton variant="outline">Add fee item</SubmitButton></div>
              </form>
            </section>
          )}
        </div>
      </div>
    </>
  );
}

function IntakeForm({ courseId, intake }: { courseId: string; intake?: { id: string; name: string; startDate: Date; applicationDeadline: Date | null; capacity: number | null; status: string } }) {
  return (
    <form action={saveIntake} className="mt-3 grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="courseId" value={courseId} />
      {intake && <input type="hidden" name="id" value={intake.id} />}
      <div className="sm:col-span-2"><label className="field-label">Name</label><input name="name" className="input" defaultValue={intake?.name} placeholder="e.g. February 2027 intake" /></div>
      <div><label className="field-label">Start date</label><input name="startDate" type="date" className="input" defaultValue={toLocalInput(intake?.startDate, true)} /></div>
      <div><label className="field-label">Application deadline</label><input name="applicationDeadline" type="date" className="input" defaultValue={toLocalInput(intake?.applicationDeadline, true)} /></div>
      <div><label className="field-label">Capacity</label><input name="capacity" type="number" className="input" defaultValue={intake?.capacity ?? ""} /></div>
      <div><label className="field-label">Status</label><select name="status" className="input" defaultValue={intake?.status ?? "OPEN"}><option value="OPEN">Open</option><option value="CLOSED">Closed</option></select></div>
      <div className="sm:col-span-2"><SubmitButton variant="outline">Save intake</SubmitButton></div>
    </form>
  );
}
