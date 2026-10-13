import { asc, desc } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { requireStaff } from "@/lib/auth";
import { PortalTitle } from "@/components/portal/portal-shell";
import { Flash } from "@/components/staff/flash";
import { Badge } from "@/components/ui/ui";
import { SubmitButton } from "@/components/ui/submit-button";
import { postAnnouncement } from "@/app/actions/staff/admin";
import { fmtDateTime, titleCase } from "@/lib/utils";

export const metadata = { title: "Announcements" };

export default async function AnnouncementsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireStaff("announcements.manage");
  const [items, courses] = await Promise.all([
    db.query.announcements.findMany({ with: { author: true, course: true }, orderBy: desc(s.announcements.publishedAt), limit: 50 }),
    db.select({ id: s.courses.id, name: s.courses.name }).from(s.courses).orderBy(asc(s.courses.name)),
  ]);
  return (
    <>
      <PortalTitle title="Announcements" lead="Notices shown in the student portal." />
      <Flash searchParams={searchParams} />
      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <ul className="space-y-3">
          {items.map((a) => <li key={a.id} className="panel p-4"><div className="flex justify-between gap-2"><p className="font-semibold">{a.title}</p><Badge>{a.course?.name ?? titleCase(a.audience)}</Badge></div><p className="text-xs text-slate">{a.author?.name} · {fmtDateTime(a.publishedAt)}</p><p className="mt-2 whitespace-pre-line text-sm">{a.body}</p></li>)}
        </ul>
        <section className="panel h-fit p-5">
          <h2 className="font-display text-lg font-semibold">New announcement</h2>
          <form action={postAnnouncement} className="mt-3 grid gap-3">
            <input name="title" className="input" placeholder="Title" />
            <textarea name="body" rows={5} className="input" placeholder="Message" />
            <select name="audience" className="input"><option value="ALL_STUDENTS">All students</option><option value="COURSE">One course</option><option value="EVERYONE">Everyone</option></select>
            <select name="courseId" className="input"><option value="">(for “One course”) choose…</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            <SubmitButton>Publish</SubmitButton>
          </form>
        </section>
      </div>
    </>
  );
}
