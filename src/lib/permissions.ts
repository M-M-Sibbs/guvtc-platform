import type { Role } from "@/db/schema";

// Capability-based RBAC. Each staff page and server action checks one of these on the server.
// Roles get only what their work needs — e.g. MARKETING cannot read marks or finance.
export const CAPABILITIES = {
  "dashboard.view": ["SUPER_ADMIN", "PRINCIPAL", "ADMISSIONS", "REGISTRAR", "LECTURER", "EXAMS", "FINANCE", "MARKETING", "LIBRARIAN"],
  "analytics.view": ["SUPER_ADMIN", "PRINCIPAL"],
  "ads.manage": ["SUPER_ADMIN", "MARKETING", "PRINCIPAL"],
  "ads.approve": ["SUPER_ADMIN", "PRINCIPAL"],
  "news.manage": ["SUPER_ADMIN", "MARKETING", "PRINCIPAL"],
  "enquiries.manage": ["SUPER_ADMIN", "MARKETING", "ADMISSIONS", "PRINCIPAL"],
  "courses.manage": ["SUPER_ADMIN", "REGISTRAR", "PRINCIPAL", "MARKETING"],
  "applications.view": ["SUPER_ADMIN", "ADMISSIONS", "PRINCIPAL", "REGISTRAR"],
  "applications.decide": ["SUPER_ADMIN", "ADMISSIONS"],
  "students.manage": ["SUPER_ADMIN", "REGISTRAR", "ADMISSIONS"],
  "students.view": ["SUPER_ADMIN", "REGISTRAR", "ADMISSIONS", "PRINCIPAL", "EXAMS", "FINANCE"],
  "classes.manage": ["SUPER_ADMIN", "REGISTRAR"],
  "elearning.manage": ["SUPER_ADMIN", "LECTURER", "LIBRARIAN"],
  "attendance.record": ["SUPER_ADMIN", "LECTURER", "REGISTRAR"],
  "marks.enter": ["SUPER_ADMIN", "LECTURER", "EXAMS"],
  "results.approve": ["SUPER_ADMIN", "EXAMS"],
  "results.publish": ["SUPER_ADMIN", "EXAMS"],
  "finance.manage": ["SUPER_ADMIN", "FINANCE"],
  "finance.confirm": ["SUPER_ADMIN", "FINANCE"],
  "inventory.manage": ["SUPER_ADMIN", "REGISTRAR", "PRINCIPAL", "LIBRARIAN"],
  "announcements.manage": ["SUPER_ADMIN", "REGISTRAR", "LECTURER", "PRINCIPAL", "MARKETING"],
  "notifications.manage": ["SUPER_ADMIN", "ADMISSIONS"],
  "users.manage": ["SUPER_ADMIN"],
  "settings.manage": ["SUPER_ADMIN"],
  "audit.view": ["SUPER_ADMIN", "PRINCIPAL"],
} as const satisfies Record<string, readonly Role[]>;

export type Capability = keyof typeof CAPABILITIES;

export function can(role: Role | undefined | null, cap: Capability): boolean {
  if (!role) return false;
  return (CAPABILITIES[cap] as readonly Role[]).includes(role);
}

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super administrator",
  PRINCIPAL: "Principal / management",
  ADMISSIONS: "Admissions officer",
  REGISTRAR: "Registrar",
  LECTURER: "Lecturer / instructor",
  EXAMS: "Examinations officer",
  FINANCE: "Finance officer",
  MARKETING: "Marketing & communications",
  LIBRARIAN: "Librarian / resource manager",
  STUDENT: "Student",
};
