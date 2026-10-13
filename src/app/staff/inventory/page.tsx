import { asc, desc } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { requireStaff } from "@/lib/auth";
import { PortalTitle } from "@/components/portal/portal-shell";
import { Flash } from "@/components/staff/flash";
import { Badge, Stat } from "@/components/ui/ui";
import { SubmitButton } from "@/components/ui/submit-button";
import { saveAsset, addMaintenance } from "@/app/actions/staff/admin";
import { fmtDate, fmtMoney } from "@/lib/utils";

export const metadata = { title: "Inventory & workshops" };
const COND_TONE: Record<string, "success" | "gold" | "warn" | "danger"> = { Good: "success", Fair: "gold", "Needs repair": "warn", "Out of service": "danger" };
const CONDITIONS = ["Good", "Fair", "Needs repair", "Out of service"];

export default async function InventoryPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireStaff("inventory.manage");
  const sp = await searchParams;
  const assets = await db.query.inventoryAssets.findMany({ with: { maintenance: { orderBy: desc(s.maintenanceRecords.date) } }, orderBy: [asc(s.inventoryAssets.department), asc(s.inventoryAssets.code)] });
  const list = assets.filter((a) => (!sp.dept || a.department === sp.dept) && (!sp.cond || a.condition === sp.cond));
  const depts = [...new Set(assets.map((a) => a.department))];
  return (
    <>
      <PortalTitle title="Inventory & workshops" lead="Computers, sewing machines, salon, mechanical and catering equipment — location, condition and maintenance history." />
      <Flash searchParams={searchParams} />
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Stat label="Asset records" value={assets.length} sub={`${assets.reduce((t, a) => t + a.quantity, 0)} items`} />
        {CONDITIONS.slice(1).map((c) => <Stat key={c} label={c} value={assets.filter((a) => a.condition === c).length} />)}
      </div>
      <form className="mb-4 flex flex-wrap gap-2">
        <select name="dept" defaultValue={sp.dept ?? ""} className="input max-w-xs"><option value="">All departments</option>{depts.map((d) => <option key={d}>{d}</option>)}</select>
        <select name="cond" defaultValue={sp.cond ?? ""} className="input max-w-xs"><option value="">Any condition</option>{CONDITIONS.map((c) => <option key={c}>{c}</option>)}</select>
        <button className="btn btn-outline">Filter</button>
      </form>
      <div className="panel overflow-x-auto">
        <table className="table-std">
          <thead><tr><th>Code</th><th>Item</th><th>Location</th><th>Qty</th><th>Condition</th><th>Last maintenance</th><th></th></tr></thead>
          <tbody>
            {list.map((a) => (
              <tr key={a.id}>
                <td className="font-mono text-xs">{a.code}</td>
                <td>{a.name}<span className="block text-xs text-slate">{a.category} · {a.department}{a.purchaseCost && ` · ${fmtMoney(a.purchaseCost)}`}</span></td>
                <td>{a.location}</td><td>{a.quantity}</td>
                <td><Badge tone={COND_TONE[a.condition] ?? "neutral"}>{a.condition}</Badge></td>
                <td className="text-sm">{a.maintenance[0] ? <>{fmtDate(a.maintenance[0].date)}<span className="block text-xs text-slate">{a.maintenance[0].description}</span></> : "—"}</td>
                <td>
                  <details><summary className="cursor-pointer text-xs underline">Log maintenance</summary>
                    <form action={addMaintenance} className="mt-2 grid w-64 gap-2">
                      <input type="hidden" name="assetId" value={a.id} />
                      <input name="description" className="input" placeholder="What was done" />
                      <input name="performedBy" className="input" placeholder="By" />
                      <input name="cost" type="number" step="0.01" className="input" placeholder="Cost" />
                      <select name="condition" className="input" defaultValue=""><option value="">Keep condition</option>{CONDITIONS.map((c) => <option key={c}>{c}</option>)}</select>
                      <button className="btn btn-outline btn-sm">Save</button>
                    </form>
                  </details>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <section className="panel mt-6 p-5">
        <h2 className="font-display text-xl font-semibold">Add equipment</h2>
        <form action={saveAsset} className="mt-3 grid gap-3 md:grid-cols-4">
          <input name="code" className="input" placeholder="Inventory code e.g. SEW-020" />
          <input name="name" className="input md:col-span-2" placeholder="Item name" />
          <input name="category" className="input" placeholder="Category" />
          <input name="location" className="input" placeholder="Location / workshop" />
          <input name="department" className="input" placeholder="Responsible department" />
          <input name="quantity" type="number" className="input" defaultValue={1} aria-label="Quantity" />
          <select name="condition" className="input">{CONDITIONS.map((c) => <option key={c}>{c}</option>)}</select>
          <input name="purchaseDate" type="date" className="input" aria-label="Purchase date" />
          <input name="purchaseCost" type="number" step="0.01" className="input" placeholder="Purchase cost" />
          <input name="notes" className="input md:col-span-2" placeholder="Notes" />
          <div><SubmitButton>Add asset</SubmitButton></div>
        </form>
      </section>
    </>
  );
}
