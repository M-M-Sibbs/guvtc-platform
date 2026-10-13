import { NextResponse, type NextRequest } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { can, type Capability } from "@/lib/permissions";
import { audit } from "@/lib/audit";

// Each export type needs its own capability; every export is written to the audit log.
const EXPORTS: Record<string, { cap: Capability; query: ReturnType<typeof sql> }> = {
  applications: { cap: "applications.view", query: sql`SELECT a.reference, a.status, a.first_name, a.last_name, a.email, a.phone, c.name AS course, i.name AS intake, a.campaign_source, a.submitted_at FROM applications a JOIN courses c ON c.id=a.course_id LEFT JOIN intakes i ON i.id=a.intake_id ORDER BY a.submitted_at DESC` },
  students: { cap: "students.view", query: sql`SELECT s.student_number, u.name, u.email, s.phone, c.name AS course, e.status, e.start_date FROM students s JOIN users u ON u.id=s.user_id LEFT JOIN enrolments e ON e.student_id=s.id LEFT JOIN courses c ON c.id=e.course_id ORDER BY s.student_number` },
  results: { cap: "results.approve", query: sql`SELECT s.student_number, u.name, c.name AS course, a.title AS assessment, a.weight, r.marks, a.max_marks, r.status, a.published_at FROM results r JOIN assessments a ON a.id=r.assessment_id JOIN courses c ON c.id=a.course_id JOIN students s ON s.id=r.student_id JOIN users u ON u.id=s.user_id WHERE a.published_at IS NOT NULL ORDER BY c.name, s.student_number` },
  attendance: { cap: "attendance.record", query: sql`SELECT a.date, g.name AS class, s.student_number, u.name, a.status FROM attendance a JOIN students s ON s.id=a.student_id JOIN users u ON u.id=s.user_id LEFT JOIN class_groups g ON g.id=a.class_group_id ORDER BY a.date DESC` },
  fees: { cap: "finance.manage", query: sql`SELECT i.number, s.student_number, u.name, i.description, i.amount, i.concession, coalesce((SELECT sum(p.amount) FROM payments p WHERE p.invoice_id=i.id AND p.status='CONFIRMED'),0) AS confirmed_paid, coalesce((SELECT sum(p.amount) FROM payments p WHERE p.invoice_id=i.id AND p.status='PENDING'),0) AS pending, i.status, i.due_date FROM invoices i JOIN students s ON s.id=i.student_id JOIN users u ON u.id=s.user_id ORDER BY i.number` },
  campaigns: { cap: "ads.manage", query: sql`SELECT ad.title, ad.status, ad.placement, ad.starts_at, ad.expires_at, ad.clicks, (SELECT count(*) FROM enquiries e WHERE e.ad_id=ad.id) AS enquiries, (SELECT count(*) FROM applications a WHERE a.ad_id=ad.id) AS applications FROM advertisements ad ORDER BY ad.created_at DESC` },
};

const cell = (v: unknown) => {
  const s = v instanceof Date ? v.toISOString() : v == null ? "" : String(v);
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s; // prevent spreadsheet formula injection
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export async function GET(req: NextRequest) {
  const me = await getCurrentUser();
  const type = req.nextUrl.searchParams.get("type") ?? "";
  const ex = EXPORTS[type];
  if (!me || me.role === "STUDENT" || !ex || !can(me.role, ex.cap)) return new NextResponse("Not permitted", { status: 403 });
  const { rows, fields } = await db.execute(ex.query);
  const header = fields.map((f) => f.name);
  const csv = [header.join(","), ...rows.map((r) => header.map((h) => cell((r as Record<string, unknown>)[h])).join(","))].join("\n");
  await audit(me, "export.csv", "report", type, { rows: rows.length });
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="guvtc-${type}-${new Date().toISOString().slice(0, 10)}.csv"` } });
}
