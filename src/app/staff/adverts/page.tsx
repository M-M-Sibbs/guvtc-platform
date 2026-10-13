import Link from "next/link";
import { desc, sql } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { requireStaff } from "@/lib/auth";
import { PortalTitle } from "@/components/portal/portal-shell";
import { StatusBadge } from "@/components/ui/ui";
import { Flash } from "@/components/staff/flash";
import { adState } from "@/lib/queries";
import { fmtDate } from "@/lib/utils";

export const metadata = { title: "Advertisements" };
const PLACEMENT: Record<string, string> = { HERO: "Homepage hero", ANNOUNCEMENT_BAR: "Announcement bar", COURSES: "Course section", SIDEBAR: "Sidebar", CAMPAIGN_PAGE: "Campaign page" };

export default async function AdvertsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireStaff("ads.manage");
  const sp = await searchParams;
  const ads = await db.select({
    ad: s.advertisements,
    applications: sql<number>`(SELECT count(*)::int FROM applications a WHERE a.ad_id = ${s.advertisements.id})`,
  }).from(s.advertisements).orderBy(desc(s.advertisements.pinned), desc(s.advertisements.updatedAt));
  const filter = sp.state ?? "";
  const rows = ads.map((r) => ({ ...r, state: adState(r.ad) })).filter((r) => !filter || r.state === filter);
  const states = ["LIVE", "SCHEDULED", "PENDING_APPROVAL", "DRAFT", "EXPIRED", "REJECTED", "ARCHIVED"];
  return (
    <>
      <PortalTitle title="Advertisements" lead="Create campaigns for new intakes, courses and services. Adverts go live after approval, inside their schedule, and stop automatically when they expire.">
        <Link href="/staff/adverts/new" className="btn btn-primary">New advert</Link>
      </PortalTitle>
      <Flash searchParams={searchParams} />
      <nav className="mb-4 flex flex-wrap gap-2 text-sm">
        <Link href="/staff/adverts" className={`rounded-sm border px-3 py-1 ${!filter ? "border-navy bg-navy text-white" : "border-line"}`}>All ({ads.length})</Link>
        {states.map((st) => {
          const n = ads.filter((r) => adState(r.ad) === st).length;
          return n ? <Link key={st} href={`/staff/adverts?state=${st}`} className={`rounded-sm border px-3 py-1 ${filter === st ? "border-navy bg-navy text-white" : "border-line"}`}><StatusBadge status={st} /> {n}</Link> : null;
        })}
      </nav>
      <div className="panel overflow-x-auto">
        <table className="table-std">
          <thead><tr><th>Advert</th><th>Placement</th><th>State</th><th>Runs</th><th className="text-right">Clicks</th><th className="text-right">Applications</th></tr></thead>
          <tbody>
            {rows.map(({ ad, state, applications }) => (
              <tr key={ad.id}>
                <td><Link href={`/staff/adverts/${ad.id}`} className="font-semibold hover:underline">{ad.pinned && "📌 "}{ad.title}</Link><span className="block text-xs text-slate">{ad.subtitle}</span></td>
                <td>{PLACEMENT[ad.placement]}</td>
                <td><StatusBadge status={state} /></td>
                <td className="whitespace-nowrap text-sm">{ad.startsAt ? fmtDate(ad.startsAt) : "Immediately"} – {ad.expiresAt ? fmtDate(ad.expiresAt) : "no expiry"}</td>
                <td className="text-right tabular-nums">{ad.clicks}</td>
                <td className="text-right tabular-nums">{applications}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
