import { count, eq } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { PortalShell } from "@/components/portal/portal-shell";
import type { NavItem } from "@/components/portal/side-nav";
import { requireStaff } from "@/lib/auth";
import { can, ROLE_LABELS, type Capability } from "@/lib/permissions";

export const dynamic = "force-dynamic";
export const metadata = { title: { default: "Staff", template: "%s · GUVTC staff" }, robots: { index: false } };

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const me = await requireStaff();
  const [[newApps], [pendingAds], [failedMail], [newEnq]] = await Promise.all([
    db.select({ n: count() }).from(s.applications).where(eq(s.applications.status, "SUBMITTED")),
    db.select({ n: count() }).from(s.advertisements).where(eq(s.advertisements.status, "PENDING_APPROVAL")),
    db.select({ n: count() }).from(s.notifications).where(eq(s.notifications.status, "FAILED")),
    db.select({ n: count() }).from(s.enquiries).where(eq(s.enquiries.status, "NEW")),
  ]);
  const all: (NavItem & { cap: Capability })[] = [
    { href: "/staff", label: "Dashboard", icon: "Grid", cap: "dashboard.view" },
    { href: "/staff/adverts", label: "Advertisements", icon: "Megaphone", cap: "ads.manage", group: "Marketing", badge: can(me.role, "ads.approve") ? pendingAds.n : 0 },
    { href: "/staff/news", label: "News, events & gallery", icon: "Bell", cap: "news.manage", group: "Marketing" },
    { href: "/staff/enquiries", label: "Enquiries", icon: "Inbox", cap: "enquiries.manage", group: "Marketing", badge: newEnq.n },
    { href: "/staff/admissions", label: "Applications", icon: "Users", cap: "applications.view", group: "Admissions", badge: newApps.n },
    { href: "/staff/students", label: "Students", icon: "Users", cap: "students.view", group: "Academics" },
    { href: "/staff/courses", label: "Courses & intakes", icon: "Book", cap: "courses.manage", group: "Academics" },
    { href: "/staff/classes", label: "Classes & timetable", icon: "Calendar", cap: "classes.manage", group: "Academics" },
    { href: "/staff/elearning", label: "eLearning content", icon: "Video", cap: "elearning.manage", group: "Academics" },
    { href: "/staff/attendance", label: "Attendance", icon: "Check", cap: "attendance.record", group: "Academics" },
    { href: "/staff/results", label: "Assessments & results", icon: "Chart", cap: "marks.enter", group: "Academics" },
    { href: "/staff/finance", label: "Fees & payments", icon: "Coins", cap: "finance.manage", group: "Administration" },
    { href: "/staff/inventory", label: "Inventory & workshops", icon: "Box", cap: "inventory.manage", group: "Administration" },
    { href: "/staff/announcements", label: "Announcements", icon: "Megaphone", cap: "announcements.manage", group: "Administration" },
    { href: "/staff/reports", label: "Reports", icon: "Chart", cap: "analytics.view", group: "Administration" },
    { href: "/staff/notifications", label: "Email log", icon: "Mail", cap: "notifications.manage", group: "System", badge: failedMail.n },
    { href: "/staff/users", label: "Users & roles", icon: "Shield", cap: "users.manage", group: "System" },
    { href: "/staff/settings", label: "Settings", icon: "Settings", cap: "settings.manage", group: "System" },
    { href: "/staff/audit", label: "Audit log", icon: "File", cap: "audit.view", group: "System" },
  ];
  const items = all.filter((i) => can(me.role, i.cap)).map(({ cap: _c, ...rest }) => rest);
  return <PortalShell title="Staff administration" user={me} roleLabel={ROLE_LABELS[me.role]} items={items} root="/staff">{children}</PortalShell>;
}
