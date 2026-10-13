import Link from "next/link";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { requireStudent } from "@/lib/auth";
import { PortalTitle } from "@/components/portal/portal-shell";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const me = await requireStudent();
  const st = await db.query.students.findFirst({ where: eq(s.students.id, me.studentId) });
  const rows: [string, string | null | undefined][] = [
    ["Name", me.name], ["Email", me.email], ["Student number", st?.studentNumber], ["Phone", st?.phone], ["Address", st?.address], ["Emergency contact", st?.emergencyContact],
  ];
  return (
    <>
      <PortalTitle title="My profile" lead="To correct any of these details, contact the registrar's office — changes to student records are checked and logged." />
      <dl className="panel divide-y divide-line">
        {rows.map(([k, v]) => <div key={k} className="grid gap-1 px-5 py-3 sm:grid-cols-[200px_1fr]"><dt className="text-slate">{k}</dt><dd className="font-medium">{v || "—"}</dd></div>)}
      </dl>
      <Link href="/account/password" className="btn btn-outline mt-6">Change password</Link>
    </>
  );
}
