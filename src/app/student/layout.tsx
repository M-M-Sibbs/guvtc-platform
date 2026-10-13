import { PortalShell } from "@/components/portal/portal-shell";
import { requireStudent } from "@/lib/auth";
import type { NavItem } from "@/components/portal/side-nav";

export const dynamic = "force-dynamic";
export const metadata = { title: { default: "Student portal", template: "%s · Student portal" }, robots: { index: false } };

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const me = await requireStudent();
  const items: NavItem[] = [
    { href: "/student", label: "Dashboard", icon: "Grid" },
    { href: "/student/courses", label: "My courses", icon: "Book" },
    { href: "/student/live", label: "Live classes", icon: "Video" },
    { href: "/student/assignments", label: "Notes & tasks", icon: "File" },
    { href: "/student/results", label: "My results", icon: "Chart" },
    { href: "/student/timetable", label: "Timetable", icon: "Calendar" },
    { href: "/student/fees", label: "Fees", icon: "Coins" },
    { href: "/student/notices", label: "Notices", icon: "Bell" },
    { href: "/student/profile", label: "Profile", icon: "Users" },
  ];
  return <PortalShell title="Student learning portal" user={me} roleLabel="Student" items={items} root="/student">{children}</PortalShell>;
}
