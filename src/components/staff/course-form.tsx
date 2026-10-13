import { saveCourse } from "@/app/actions/staff/courses";
import { SubmitButton } from "@/components/ui/submit-button";
import { DELIVERY_LABELS } from "@/lib/utils";
import type { InferSelectModel } from "drizzle-orm";
import type { courses } from "@/db/schema";

type Course = InferSelectModel<typeof courses>;

export function CourseForm({ course, categories }: { course?: Course; categories: { id: string; name: string }[] }) {
  return (
    <form action={saveCourse} className="panel grid gap-5 p-6">
      {course && <input type="hidden" name="id" value={course.id} />}
      <div className="grid gap-5 sm:grid-cols-[2fr_1fr_1fr]">
        <div><label className="field-label" htmlFor="name">Course name *</label><input id="name" name="name" className="input" defaultValue={course?.name} /></div>
        <div><label className="field-label" htmlFor="categoryId">Department *</label>
          <select id="categoryId" name="categoryId" className="input" defaultValue={course?.categoryId}>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <div><label className="field-label" htmlFor="status">Status</label>
          <select id="status" name="status" className="input" defaultValue={course?.status ?? "DRAFT"}><option value="OPEN">Open for applications</option><option value="CLOSED">Closed (still listed)</option><option value="DRAFT">Draft (hidden)</option></select></div>
      </div>
      <div><label className="field-label" htmlFor="summary">One-line summary *</label><input id="summary" name="summary" className="input" defaultValue={course?.summary} /></div>
      <div><label className="field-label" htmlFor="description">Course overview</label><textarea id="description" name="description" rows={4} className="input" defaultValue={course?.description} /></div>
      <div><label className="field-label" htmlFor="outcomes">Learning outcomes</label><textarea id="outcomes" name="outcomes" rows={4} className="input" defaultValue={course?.outcomes.join("\n")} /><p className="field-hint">One per line.</p></div>
      <div className="grid gap-5 sm:grid-cols-3">
        <div><label className="field-label" htmlFor="durationText">Verified duration</label><input id="durationText" name="durationText" className="input" defaultValue={course?.durationText ?? ""} placeholder="e.g. 6 weeks" /><p className="field-hint">Leave empty until confirmed.</p></div>
        <div><label className="field-label" htmlFor="durationWeeks">Duration in weeks</label><input id="durationWeeks" name="durationWeeks" type="number" min={1} max={52} className="input" defaultValue={course?.durationWeeks ?? ""} /><p className="field-hint">Used by the course-length filter.</p></div>
        <div><label className="field-label" htmlFor="feesText">Fees (public text)</label><input id="feesText" name="feesText" className="input" defaultValue={course?.feesText ?? ""} placeholder="Only when officially confirmed" /></div>
      </div>
      <fieldset><legend className="field-label">Delivery modes</legend>
        <div className="flex flex-wrap gap-4">{Object.entries(DELIVERY_LABELS).map(([v, l]) => <label key={v} className="flex items-center gap-2 text-sm"><input type="checkbox" name="deliveryModes" value={v} defaultChecked={course ? course.deliveryModes.includes(v) : v === "IN_PERSON"} className="accent-navy" />{l}</label>)}</div>
      </fieldset>
      <div className="grid gap-5 sm:grid-cols-2">
        <div><label className="field-label" htmlFor="entryRequirements">Entry requirements</label><textarea id="entryRequirements" name="entryRequirements" rows={3} className="input" defaultValue={course?.entryRequirements ?? ""} /></div>
        <div><label className="field-label" htmlFor="equipment">Required equipment</label><textarea id="equipment" name="equipment" rows={3} className="input" defaultValue={course?.equipment ?? ""} /></div>
      </div>
      <div><label className="field-label" htmlFor="videoUrl">Introduction video (embed link)</label><input id="videoUrl" name="videoUrl" className="input" defaultValue={course?.videoUrl ?? ""} /></div>
      <div><label className="field-label" htmlFor="faqs">Frequently asked questions</label>
        <textarea id="faqs" name="faqs" rows={6} className="input font-mono text-sm" defaultValue={course?.faqs.map((f) => `Q: ${f.q}\nA: ${f.a}`).join("\n\n")} />
        <p className="field-hint">Write each as “Q: …” then “A: …”, with a blank line between questions.</p></div>
      <label className="flex items-center gap-2"><input type="checkbox" name="featured" defaultChecked={course?.featured} className="accent-navy" />Feature this course</label>
      <div><SubmitButton>Save course</SubmitButton></div>
    </form>
  );
}
