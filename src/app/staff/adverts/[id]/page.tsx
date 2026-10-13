import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq, sql } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { PortalTitle } from "@/components/portal/portal-shell";
import { AdvertEditor } from "@/components/staff/advert-editor";
import { Flash } from "@/components/staff/flash";
import { Notice, StatusBadge } from "@/components/ui/ui";
import { adState } from "@/lib/queries";
import { transitionAdvert, duplicateAdvert } from "@/app/actions/staff/adverts";
import { fmtDate } from "@/lib/utils";

export const metadata = { title: "Edit advert" };

export default async function EditAdvert({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  const me = await requireStaff("ads.manage");
  const { id } = await params;
  const ad = await db.query.advertisements.findFirst({ where: eq(s.advertisements.id, id) });
  if (!ad) notFound();
  const [courses, [stats]] = await Promise.all([
    db.select({ id: s.courses.id, name: s.courses.name, slug: s.courses.slug }).from(s.courses).orderBy(asc(s.courses.name)),
    db.select({
      apps: sql<number>`(SELECT count(*)::int FROM applications WHERE ad_id = ${id})`,
      enq: sql<number>`(SELECT count(*)::int FROM enquiries WHERE ad_id = ${id})`,
    }).from(s.advertisements).where(eq(s.advertisements.id, id)),
  ]);
  const state = adState(ad);
  const approver = can(me.role, "ads.approve");
  const T = (action: string, label: string, variant = "btn-outline") => (
    <form action={transitionAdvert}><input type="hidden" name="id" value={ad.id} /><input type="hidden" name="action" value={action} /><button className={`btn btn-sm ${variant}`}>{label}</button></form>
  );
  return (
    <>
      <Link href="/staff/adverts" className="mb-3 inline-block text-sm underline">All adverts</Link>
      <PortalTitle title={ad.title} lead={<span className="flex items-center gap-2"><StatusBadge status={state} /> {ad.clicks} clicks · {stats.enq} enquiries · {stats.apps} applications</span>}>
        <form action={duplicateAdvert}><input type="hidden" name="id" value={ad.id} /><button className="btn btn-outline btn-sm">Duplicate</button></form>
      </PortalTitle>
      <Flash searchParams={searchParams} />

      <section className="panel mb-6 p-6">
        <h2 className="font-display text-xl font-semibold">Workflow</h2>
        {ad.status === "REJECTED" && ad.rejectionNote && <div className="mt-3"><Notice tone="danger">Rejected: {ad.rejectionNote}</Notice></div>}
        {state === "SCHEDULED" && <p className="mt-2 text-sm">Approved. Goes live {fmtDate(ad.startsAt)}.</p>}
        {state === "EXPIRED" && <p className="mt-2 text-sm">Expired {fmtDate(ad.expiresAt)} — no longer shown on the website.</p>}
        <div className="mt-4 flex flex-wrap items-start gap-2">
          {(ad.status === "DRAFT" || ad.status === "REJECTED") && T("submit", "Send for approval", "btn-primary")}
          {ad.status === "PENDING_APPROVAL" && approver && T("approve", "Approve & publish", "btn-gold")}
          {ad.status === "PENDING_APPROVAL" && approver && (
            <form action={transitionAdvert} className="flex gap-2"><input type="hidden" name="id" value={ad.id} /><input type="hidden" name="action" value="reject" />
              <input name="note" className="input !min-h-[34px] !py-1 text-sm" placeholder="Reason for rejection" required /><button className="btn btn-sm btn-danger">Reject</button></form>
          )}
          {ad.status === "PENDING_APPROVAL" && !approver && <p className="text-sm text-slate">Waiting for an approver (principal or super administrator).</p>}
          {ad.status === "PUBLISHED" && T("unpublish", "Unpublish")}
          {ad.status !== "ARCHIVED" && T("archive", "Archive")}
          {ad.status === "ARCHIVED" && T("restore", "Restore to draft")}
          {state === "LIVE" && <Link href={`/campaigns/${ad.slug}`} target="_blank" className="btn btn-sm btn-outline">Open campaign page</Link>}
        </div>
      </section>

      <section className="mb-6 overflow-hidden rounded-lg border border-line">
        <p className="bg-mist px-4 py-2 text-sm font-semibold">Preview (saved version)</p>
        <div className={ad.theme === "gold" ? "bg-gold-light p-8" : ad.theme === "mist" ? "bg-mist p-8" : "bg-navy p-8 text-white"}>
          {ad.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ad.imageUrl} alt="" className="mb-5 aspect-[16/6] w-full max-w-2xl rounded-md object-cover" />
          )}
          {ad.applicationDeadline && <p className={`text-sm font-semibold ${ad.theme === "navy" ? "text-gold" : "text-gold-ink"}`}>Applications close {fmtDate(ad.applicationDeadline)}</p>}
          <p className="mt-2 font-display text-4xl font-semibold">{ad.title}</p>
          {ad.subtitle && <p className="mt-3 text-lg opacity-90">{ad.subtitle}</p>}
          {ad.description && <p className="mt-2 max-w-2xl opacity-80">{ad.description}</p>}
          {ad.highlightCourses.length > 0 && <ul className="mt-4 flex flex-wrap gap-2">{ad.highlightCourses.map((c) => <li key={c} className="rounded-sm border border-current/30 px-3 py-1 text-sm">{c}</li>)}</ul>}
          <span className={`btn mt-5 ${ad.theme === "navy" ? "btn-gold" : "btn-primary"}`}>{ad.ctaText}</span>
        </div>
      </section>

      <AdvertEditor ad={ad} courses={courses} />
    </>
  );
}
