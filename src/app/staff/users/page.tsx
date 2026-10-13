import { asc } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { requireStaff } from "@/lib/auth";
import { PortalTitle } from "@/components/portal/portal-shell";
import { Flash } from "@/components/staff/flash";
import { Badge } from "@/components/ui/ui";
import { SubmitButton } from "@/components/ui/submit-button";
import { createStaffUser, updateUserRole, sendResetLink } from "@/app/actions/staff/admin";
import { ROLE_LABELS, CAPABILITIES } from "@/lib/permissions";
import { roleEnum } from "@/db/schema";
import { fmtDateTime } from "@/lib/utils";

export const metadata = { title: "Users & roles" };

export default async function UsersPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const me = await requireStaff("users.manage");
  const users = await db.query.users.findMany({ with: { staff: true }, orderBy: asc(s.users.name) });
  const staffUsers = users.filter((u) => u.role !== "STUDENT");
  const roles = roleEnum.enumValues.filter((r) => r !== "STUDENT");
  return (
    <>
      <PortalTitle title="Users & roles" lead="Staff accounts and what each role can do. Students are managed under Students." />
      <Flash searchParams={searchParams} />
      <div className="panel overflow-x-auto">
        <table className="table-std">
          <thead><tr><th>Name</th><th>Department</th><th>Role & access</th><th>Last sign-in</th><th></th></tr></thead>
          <tbody>
            {staffUsers.map((u) => (
              <tr key={u.id}>
                <td>{u.name}<span className="block text-xs text-slate">{u.email}</span>{u.lockedUntil && u.lockedUntil > new Date() && <Badge tone="danger">locked</Badge>}</td>
                <td className="text-sm">{u.staff?.department ?? "—"}</td>
                <td>
                  <form action={updateUserRole} className="flex flex-wrap gap-2">
                    <input type="hidden" name="userId" value={u.id} />
                    <select name="role" defaultValue={u.role} disabled={u.id === me.id} className="input !min-h-[34px] !w-auto !py-1 text-sm">{roles.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</select>
                    <select name="active" defaultValue={String(u.active)} disabled={u.id === me.id} className="input !min-h-[34px] !w-auto !py-1 text-sm"><option value="true">Active</option><option value="false">Deactivated</option></select>
                    {u.id !== me.id && <button className="btn btn-outline btn-sm">Save</button>}
                  </form>
                </td>
                <td className="text-sm">{fmtDateTime(u.lastLoginAt)}</td>
                <td><form action={sendResetLink}><input type="hidden" name="userId" value={u.id} /><button className="text-xs underline">Send reset link</button></form></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <section className="panel mt-6 p-5">
        <h2 className="font-display text-xl font-semibold">New staff account</h2>
        <form action={createStaffUser} className="mt-3 grid gap-3 md:grid-cols-3">
          <input name="name" className="input" placeholder="Full name" />
          <input name="email" type="email" className="input" placeholder="Work email" />
          <select name="role" className="input">{roles.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</select>
          <input name="department" className="input" placeholder="Department" />
          <input name="title" className="input" placeholder="Job title" />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="showOnWebsite" className="accent-navy" />Show profile on course pages</label>
          <div><SubmitButton>Create & email set-password link</SubmitButton></div>
        </form>
      </section>
      <section className="panel mt-6 overflow-x-auto">
        <h2 className="px-5 py-4 font-display text-xl font-semibold">Permission matrix</h2>
        <table className="table-std text-xs">
          <thead><tr><th>Capability</th>{roles.map((r) => <th key={r} className="!whitespace-normal">{ROLE_LABELS[r].split(" ")[0]}</th>)}</tr></thead>
          <tbody>{Object.entries(CAPABILITIES).map(([cap, rs]) => <tr key={cap}><td className="font-mono">{cap}</td>{roles.map((r) => <td key={r} className="text-center">{(rs as readonly string[]).includes(r) ? "●" : ""}</td>)}</tr>)}</tbody>
        </table>
      </section>
    </>
  );
}
