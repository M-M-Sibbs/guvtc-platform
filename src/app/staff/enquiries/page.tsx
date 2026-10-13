import { desc } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { requireStaff } from "@/lib/auth";
import { PortalTitle } from "@/components/portal/portal-shell";
import { Flash } from "@/components/staff/flash";
import { StatusBadge } from "@/components/ui/ui";
import { setEnquiryStatus } from "@/app/actions/staff/admin";
import { fmtDateTime } from "@/lib/utils";

export const metadata = { title: "Enquiries" };

export default async function EnquiriesPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireStaff("enquiries.manage");
  const rows = await db.query.enquiries.findMany({ with: { course: true }, orderBy: desc(s.enquiries.createdAt), limit: 200 });
  return (
    <>
      <PortalTitle title="Enquiries" lead="Questions from the website. Each one was also emailed to the admissions inbox." />
      <Flash searchParams={searchParams} />
      <ul className="space-y-3">
        {rows.map((e) => (
          <li key={e.id} className="panel p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="font-semibold">{e.name} <span className="font-normal text-slate">· {e.course?.name ?? "General"} · {fmtDateTime(e.createdAt)}</span></p>
                <p className="text-sm"><a className="underline" href={`mailto:${e.email}?subject=${encodeURIComponent("Your enquiry to GUVTC")}`}>{e.email}</a>{e.phone && <> · <a className="underline" href={`tel:${e.phone}`}>{e.phone}</a></>}</p></div>
              <div className="flex items-center gap-2"><StatusBadge status={e.status} />
                <form action={setEnquiryStatus} className="flex gap-1"><input type="hidden" name="id" value={e.id} />
                  <select name="status" defaultValue={e.status} className="input !min-h-[32px] !w-auto !py-0 text-sm"><option value="NEW">New</option><option value="RESPONDED">Responded</option><option value="CLOSED">Closed</option></select><button className="btn btn-outline btn-sm">Update</button></form>
              </div>
            </div>
            <p className="mt-3 whitespace-pre-line">{e.message}</p>
          </li>
        ))}
      </ul>
    </>
  );
}
