import Link from "next/link";
import { saveAdvert } from "@/app/actions/staff/adverts";
import { SubmitButton } from "@/components/ui/submit-button";
import { toLocalInput } from "@/lib/utils";
import { uploadMode } from "@/lib/storage";
import { UploadField } from "@/components/ui/upload-field";
import type { InferSelectModel } from "drizzle-orm";
import type { advertisements } from "@/db/schema";

type Ad = InferSelectModel<typeof advertisements>;

export function AdvertEditor({ ad, courses }: { ad?: Ad; courses: { id: string; name: string; slug: string }[] }) {
  return (
    <form action={saveAdvert} className="grid gap-6" encType="multipart/form-data">
      {ad && <input type="hidden" name="id" value={ad.id} />}
      {ad?.imageUrl && <input type="hidden" name="existingImage" value={ad.imageUrl} />}
      <section className="panel grid gap-5 p-6">
        <h2 className="font-display text-xl font-semibold">Message</h2>
        <div><label className="field-label" htmlFor="title">Title <span className="text-danger">*</span></label><input id="title" name="title" className="input" defaultValue={ad?.title} required placeholder="e.g. New AI short courses" /></div>
        <div><label className="field-label" htmlFor="subtitle">Subtitle</label><input id="subtitle" name="subtitle" className="input" defaultValue={ad?.subtitle ?? ""} placeholder="e.g. Turn your ideas into digital skills." /></div>
        <div><label className="field-label" htmlFor="description">Full description</label><textarea id="description" name="description" className="input" defaultValue={ad?.description ?? ""} /></div>
        <div><label className="field-label" htmlFor="highlightCourses">Courses to list on the advert</label><textarea id="highlightCourses" name="highlightCourses" className="input" rows={4} defaultValue={ad?.highlightCourses.join("\n")} /><p className="field-hint">One per line, shown as tags.</p></div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div><label className="field-label" htmlFor="ctaText">Button text <span className="text-danger">*</span></label><input id="ctaText" name="ctaText" className="input" defaultValue={ad?.ctaText ?? "Apply online"} /></div>
          <div><label className="field-label" htmlFor="ctaUrl">Button link <span className="text-danger">*</span></label><input id="ctaUrl" name="ctaUrl" className="input" defaultValue={ad?.ctaUrl ?? "/apply"} list="link-suggestions" />
            <datalist id="link-suggestions">
              <option value="/apply" /><option value="/ai-courses" /><option value="/courses" /><option value="/contact" />
              {courses.map((c) => <option key={c.id} value={`/courses/${c.slug}`} />)}
            </datalist>
            <p className="field-hint">A page on this site (starts with /) or an https:// address.</p></div>
        </div>
      </section>

      <section className="panel grid gap-5 p-6">
        <h2 className="font-display text-xl font-semibold">Media</h2>
        <div>
          <label className="field-label" htmlFor="image">Cover image</label>
          {ad?.imageUrl && (
            <div className="mb-3 flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ad.imageUrl} alt="" className="h-20 w-36 rounded-sm object-cover" />
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="removeImage" className="accent-navy" />Remove image</label>
            </div>
          )}
          <UploadField id="image" name="image" kind="image" folder="public/ads" mode={uploadMode()} accept="image/jpeg,image/png,image/webp" />
          <p className="field-hint">JPG, PNG or WebP up to 8 MB. Use approved photographs of real GUVTC training activities.</p>
        </div>
        <div><label className="field-label" htmlFor="videoUrl">Video embed link</label><input id="videoUrl" name="videoUrl" className="input" defaultValue={ad?.videoUrl ?? ""} placeholder="https://www.youtube-nocookie.com/embed/…" /></div>
      </section>

      <section className="panel grid gap-5 p-6">
        <h2 className="font-display text-xl font-semibold">Placement & schedule</h2>
        <div className="grid gap-5 sm:grid-cols-3">
          <div><label className="field-label" htmlFor="placement">Placement</label>
            <select id="placement" name="placement" className="input" defaultValue={ad?.placement ?? "HERO"}>
              <option value="HERO">Homepage hero</option><option value="ANNOUNCEMENT_BAR">Announcement bar (top of every page)</option>
              <option value="COURSES">Course section</option><option value="SIDEBAR">Sidebar</option><option value="CAMPAIGN_PAGE">AI courses campaign page</option>
            </select></div>
          <div><label className="field-label" htmlFor="courseId">Linked course</label>
            <select id="courseId" name="courseId" className="input" defaultValue={ad?.courseId ?? ""}>
              <option value="">None</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select></div>
          <div><label className="field-label" htmlFor="category">Category label</label><input id="category" name="category" className="input" defaultValue={ad?.category ?? ""} placeholder="e.g. Catering" /></div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div><label className="field-label" htmlFor="startsAt">Show from</label><input id="startsAt" name="startsAt" type="datetime-local" className="input" defaultValue={toLocalInput(ad?.startsAt)} /><p className="field-hint">Empty = as soon as it is approved.</p></div>
          <div><label className="field-label" htmlFor="expiresAt">Expires</label><input id="expiresAt" name="expiresAt" type="datetime-local" className="input" defaultValue={toLocalInput(ad?.expiresAt)} /><p className="field-hint">The advert disappears automatically at this time.</p></div>
          <div><label className="field-label" htmlFor="intakeStart">Intake start date</label><input id="intakeStart" name="intakeStart" type="date" className="input" defaultValue={toLocalInput(ad?.intakeStart, true)} /></div>
          <div><label className="field-label" htmlFor="applicationDeadline">Application deadline</label><input id="applicationDeadline" name="applicationDeadline" type="date" className="input" defaultValue={toLocalInput(ad?.applicationDeadline, true)} /></div>
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          <div><label className="field-label" htmlFor="priority">Priority</label><input id="priority" name="priority" type="number" className="input" defaultValue={ad?.priority ?? 0} /><p className="field-hint">Higher shows first.</p></div>
          <div><label className="field-label" htmlFor="theme">Style</label>
            <select id="theme" name="theme" className="input" defaultValue={ad?.theme ?? "navy"}><option value="navy">Navy</option><option value="gold">Gold</option><option value="mist">Mist</option></select></div>
          <label className="mt-7 flex items-center gap-2"><input type="checkbox" name="pinned" defaultChecked={ad?.pinned} className="h-4 w-4 accent-navy" />Pin to the top</label>
        </div>
      </section>

      <div className="flex gap-3">
        <SubmitButton pending="Saving…">{ad ? "Save changes" : "Create draft"}</SubmitButton>
        <Link href="/staff/adverts" className="btn btn-outline">Cancel</Link>
      </div>
    </form>
  );
}
