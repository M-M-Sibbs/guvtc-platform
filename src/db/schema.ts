// GUVTC Digital Campus — one PostgreSQL database for the website, admissions,
// eLearning and school management. Drizzle ORM schema (pure TypeScript, no engine binaries).
import { relations, sql } from "drizzle-orm";
import {
  pgTable, pgEnum, text, integer, boolean, timestamp, jsonb, numeric, doublePrecision,
  uniqueIndex, index,
} from "drizzle-orm/pg-core";

const id = () => text("id").primaryKey().$defaultFn(() => crypto.randomUUID());
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const ts = (name: string) => timestamp(name, { withTimezone: true });
const money = (name: string) => numeric(name, { precision: 12, scale: 2 });

// ───────────────────────── Enums ─────────────────────────
export const roleEnum = pgEnum("role", [
  "SUPER_ADMIN", "PRINCIPAL", "ADMISSIONS", "REGISTRAR", "LECTURER", "EXAMS",
  "FINANCE", "MARKETING", "LIBRARIAN", "STUDENT",
]);
export const courseStatusEnum = pgEnum("course_status", ["OPEN", "CLOSED", "DRAFT"]);
export const intakeStatusEnum = pgEnum("intake_status", ["OPEN", "CLOSED"]);
export const adStatusEnum = pgEnum("ad_status", ["DRAFT", "PENDING_APPROVAL", "PUBLISHED", "ARCHIVED", "REJECTED"]);
export const adPlacementEnum = pgEnum("ad_placement", ["HERO", "ANNOUNCEMENT_BAR", "COURSES", "SIDEBAR", "CAMPAIGN_PAGE"]);
export const newsKindEnum = pgEnum("news_kind", ["NEWS", "EVENT", "NOTICE", "OPPORTUNITY"]);
export const enquiryStatusEnum = pgEnum("enquiry_status", ["NEW", "RESPONDED", "CLOSED"]);
export const applicationStatusEnum = pgEnum("application_status", [
  "SUBMITTED", "UNDER_REVIEW", "CORRECTIONS_REQUESTED", "ACCEPTED", "WAITLISTED", "REJECTED", "ENROLLED", "WITHDRAWN",
]);
export const enrolmentStatusEnum = pgEnum("enrolment_status", ["ACTIVE", "COMPLETED", "WITHDRAWN", "SUSPENDED"]);
export const lessonTypeEnum = pgEnum("lesson_type", ["LIVE", "RECORDED", "NOTES"]);
export const attendanceStatusEnum = pgEnum("attendance_status", ["PRESENT", "ABSENT", "LATE", "EXCUSED"]);
export const assessmentTypeEnum = pgEnum("assessment_type", ["CONTINUOUS", "PRACTICAL", "FINAL_EXAM"]);
export const resultStatusEnum = pgEnum("result_status", ["RECORDED", "ABSENT", "INCOMPLETE", "WITHHELD"]);
export const invoiceStatusEnum = pgEnum("invoice_status", ["UNPAID", "PART_PAID", "PAID", "CANCELLED"]);
export const paymentStatusEnum = pgEnum("payment_status", ["PENDING", "CONFIRMED", "REVERSED"]);
export const audienceEnum = pgEnum("audience", ["ALL_STUDENTS", "COURSE", "STAFF", "EVERYONE"]);
export const notificationStatusEnum = pgEnum("notification_status", ["PENDING", "SENT", "FAILED"]);

export type Role = (typeof roleEnum.enumValues)[number];
export type ApplicationStatus = (typeof applicationStatusEnum.enumValues)[number];
export type AdStatus = (typeof adStatusEnum.enumValues)[number];
export type AdPlacement = (typeof adPlacementEnum.enumValues)[number];

// ───────────────────────── Identity ─────────────────────────
export const users = pgTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull(),
  active: boolean("active").notNull().default(true),
  mustChangePassword: boolean("must_change_password").notNull().default(false),
  failedLogins: integer("failed_logins").notNull().default(0),
  lockedUntil: ts("locked_until"),
  lastLoginAt: ts("last_login_at"),
  createdAt: createdAt(),
});

export const passwordResets = pgTable("password_resets", {
  id: id(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: ts("expires_at").notNull(),
  usedAt: ts("used_at"),
  createdAt: createdAt(),
});

export const students = pgTable("students", {
  id: id(),
  userId: text("user_id").notNull().unique().references(() => users.id),
  studentNumber: text("student_number").notNull().unique(),
  phone: text("phone"),
  address: text("address"),
  dateOfBirth: ts("date_of_birth"),
  nationalId: text("national_id"),
  emergencyContact: text("emergency_contact"),
  createdAt: createdAt(),
});

export const staff = pgTable("staff", {
  id: id(),
  userId: text("user_id").notNull().unique().references(() => users.id),
  staffNumber: text("staff_number").notNull().unique(),
  department: text("department").notNull(),
  title: text("title"),
  bio: text("bio"),
  phone: text("phone"),
  showOnWebsite: boolean("show_on_website").notNull().default(false),
  createdAt: createdAt(),
});

// ───────────────────────── Catalogue ─────────────────────────
export const courseCategories = pgTable("course_categories", {
  id: id(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  isAI: boolean("is_ai").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
});

export type Faq = { q: string; a: string };

export const courses = pgTable("courses", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  categoryId: text("category_id").notNull().references(() => courseCategories.id),
  summary: text("summary").notNull(),
  description: text("description").notNull(),
  outcomes: text("outcomes").array().notNull().default(sql`'{}'::text[]`),
  // Verified duration per course. Left empty until GUVTC confirms it — never auto-filled with "2 weeks – 6 months".
  durationText: text("duration_text"),
  durationWeeks: integer("duration_weeks"),
  deliveryModes: text("delivery_modes").array().notNull().default(sql`'{}'::text[]`),
  entryRequirements: text("entry_requirements"),
  equipment: text("equipment"),
  feesText: text("fees_text"), // shown publicly only once officially confirmed
  status: courseStatusEnum("status").notNull().default("OPEN"),
  featured: boolean("featured").notNull().default(false),
  faqs: jsonb("faqs").$type<Faq[]>().notNull().default([]),
  coverImage: text("cover_image"),
  videoUrl: text("video_url"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const intakes = pgTable("intakes", {
  id: id(),
  courseId: text("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  startDate: ts("start_date").notNull(),
  applicationDeadline: ts("application_deadline"),
  capacity: integer("capacity"),
  status: intakeStatusEnum("status").notNull().default("OPEN"),
});

// ───────────────────────── Marketing ─────────────────────────
export const advertisements = pgTable("advertisements", {
  id: id(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  description: text("description"),
  imageUrl: text("image_url"),
  videoUrl: text("video_url"),
  ctaText: text("cta_text").notNull().default("Apply online"),
  ctaUrl: text("cta_url").notNull().default("/apply"),
  courseId: text("course_id").references(() => courses.id, { onDelete: "set null" }),
  highlightCourses: text("highlight_courses").array().notNull().default(sql`'{}'::text[]`),
  category: text("category"),
  placement: adPlacementEnum("placement").notNull().default("HERO"),
  theme: text("theme").notNull().default("navy"),
  status: adStatusEnum("status").notNull().default("DRAFT"),
  pinned: boolean("pinned").notNull().default(false),
  priority: integer("priority").notNull().default(0),
  startsAt: ts("starts_at"),
  expiresAt: ts("expires_at"),
  intakeStart: ts("intake_start"),
  applicationDeadline: ts("application_deadline"),
  clicks: integer("clicks").notNull().default(0),
  impressions: integer("impressions").notNull().default(0),
  rejectionNote: text("rejection_note"),
  createdById: text("created_by_id"),
  approvedById: text("approved_by_id"),
  createdAt: createdAt(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const newsPosts = pgTable("news_posts", {
  id: id(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  excerpt: text("excerpt").notNull(),
  body: text("body").notNull(),
  kind: newsKindEnum("kind").notNull().default("NEWS"),
  eventDate: ts("event_date"),
  location: text("location"),
  registrable: boolean("registrable").notNull().default(false),
  imageUrl: text("image_url"),
  published: boolean("published").notNull().default(false),
  publishedAt: ts("published_at"),
  createdAt: createdAt(),
});

export const eventRegistrations = pgTable("event_registrations", {
  id: id(),
  newsId: text("news_id").notNull().references(() => newsPosts.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  attended: boolean("attended").notNull().default(false),
  createdAt: createdAt(),
});

export const galleryItems = pgTable("gallery_items", {
  id: id(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  caption: text("caption"),
  imageUrl: text("image_url"),
  published: boolean("published").notNull().default(true),
  consent: boolean("consent").notNull().default(false),
  createdAt: createdAt(),
});

export const enquiries = pgTable("enquiries", {
  id: id(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  courseId: text("course_id").references(() => courses.id, { onDelete: "set null" }),
  adId: text("ad_id").references(() => advertisements.id, { onDelete: "set null" }),
  message: text("message").notNull(),
  consent: boolean("consent").notNull().default(false),
  source: text("source"),
  status: enquiryStatusEnum("status").notNull().default("NEW"),
  createdAt: createdAt(),
});

// ───────────────────────── Admissions ─────────────────────────
export const applications = pgTable("applications", {
  id: id(),
  reference: text("reference").notNull().unique(),
  courseId: text("course_id").notNull().references(() => courses.id),
  intakeId: text("intake_id").references(() => intakes.id, { onDelete: "set null" }),
  adId: text("ad_id").references(() => advertisements.id, { onDelete: "set null" }),
  campaignSource: text("campaign_source"),
  status: applicationStatusEnum("status").notNull().default("SUBMITTED"),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  address: text("address"),
  dateOfBirth: ts("date_of_birth"),
  gender: text("gender"),
  nationalId: text("national_id"),
  deliveryMode: text("delivery_mode"),
  highestQualification: text("highest_qualification"),
  results: text("results"),
  priorTraining: text("prior_training"),
  experience: text("experience"),
  accessibility: text("accessibility"),
  emergencyName: text("emergency_name"),
  emergencyPhone: text("emergency_phone"),
  consent: boolean("consent").notNull().default(false),
  decisionNote: text("decision_note"),
  studentId: text("student_id").references(() => students.id, { onDelete: "set null" }),
  submittedAt: ts("submitted_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
}, (t) => [index("applications_status_idx").on(t.status)]);

export const applicationDocuments = pgTable("application_documents", {
  id: id(),
  applicationId: text("application_id").notNull().references(() => applications.id, { onDelete: "cascade" }),
  docType: text("doc_type").notNull(),
  fileName: text("file_name").notNull(),
  storageKey: text("storage_key").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  reviewStatus: text("review_status").notNull().default("PENDING"),
  createdAt: createdAt(),
});

export const applicationEvents = pgTable("application_events", {
  id: id(),
  applicationId: text("application_id").notNull().references(() => applications.id, { onDelete: "cascade" }),
  fromStatus: applicationStatusEnum("from_status"),
  toStatus: applicationStatusEnum("to_status").notNull(),
  note: text("note"),
  actorId: text("actor_id"),
  actorName: text("actor_name"),
  createdAt: createdAt(),
});

// ───────────────────────── Academics ─────────────────────────
export const classGroups = pgTable("class_groups", {
  id: id(),
  name: text("name").notNull(),
  courseId: text("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  lecturerId: text("lecturer_id").references(() => staff.id, { onDelete: "set null" }),
  room: text("room"),
  capacity: integer("capacity"),
});

export const enrolments = pgTable("enrolments", {
  id: id(),
  studentId: text("student_id").notNull().references(() => students.id),
  courseId: text("course_id").notNull().references(() => courses.id),
  intakeId: text("intake_id").references(() => intakes.id, { onDelete: "set null" }),
  classGroupId: text("class_group_id").references(() => classGroups.id, { onDelete: "set null" }),
  status: enrolmentStatusEnum("status").notNull().default("ACTIVE"),
  startDate: ts("start_date").notNull().defaultNow(),
  completedAt: ts("completed_at"),
  createdAt: createdAt(),
}, (t) => [uniqueIndex("enrolment_unique").on(t.studentId, t.courseId)]);

export const timetableSlots = pgTable("timetable_slots", {
  id: id(),
  classGroupId: text("class_group_id").notNull().references(() => classGroups.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(), // 1 Mon … 6 Sat
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  room: text("room"),
  activity: text("activity").notNull().default("Lesson"),
});

export const modules = pgTable("modules", {
  id: id(),
  courseId: text("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  objectives: text("objectives"),
  order: integer("order").notNull().default(0),
});

export const lessons = pgTable("lessons", {
  id: id(),
  moduleId: text("module_id").notNull().references(() => modules.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  type: lessonTypeEnum("type").notNull(),
  content: text("content"),
  videoUrl: text("video_url"),
  fileKey: text("file_key"),
  fileName: text("file_name"),
  meetingUrl: text("meeting_url"),
  startsAt: ts("starts_at"),
  durationMins: integer("duration_mins"),
  recordingUrl: text("recording_url"),
  published: boolean("published").notNull().default(true),
  order: integer("order").notNull().default(0),
  createdAt: createdAt(),
});

export const lessonProgress = pgTable("lesson_progress", {
  id: id(),
  lessonId: text("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
  studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  completedAt: ts("completed_at").notNull().defaultNow(),
}, (t) => [uniqueIndex("lesson_progress_unique").on(t.lessonId, t.studentId)]);

export const attendance = pgTable("attendance", {
  id: id(),
  studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  classGroupId: text("class_group_id").references(() => classGroups.id, { onDelete: "set null" }),
  lessonId: text("lesson_id").references(() => lessons.id, { onDelete: "set null" }),
  date: text("date").notNull(), // YYYY-MM-DD
  status: attendanceStatusEnum("status").notNull(),
  recordedById: text("recorded_by_id"),
  createdAt: createdAt(),
}, (t) => [uniqueIndex("attendance_unique").on(t.studentId, t.classGroupId, t.date)]);

export const assignments = pgTable("assignments", {
  id: id(),
  courseId: text("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  instructions: text("instructions").notNull(),
  practical: boolean("practical").notNull().default(false),
  dueAt: ts("due_at").notNull(),
  maxMarks: integer("max_marks").notNull().default(100),
  published: boolean("published").notNull().default(true),
  createdAt: createdAt(),
});

export const submissions = pgTable("submissions", {
  id: id(),
  assignmentId: text("assignment_id").notNull().references(() => assignments.id, { onDelete: "cascade" }),
  studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  text: text("text"),
  fileKey: text("file_key"),
  fileName: text("file_name"),
  submittedAt: ts("submitted_at").notNull().defaultNow(),
  marks: integer("marks"),
  feedback: text("feedback"),
  gradedAt: ts("graded_at"),
  gradedById: text("graded_by_id"),
}, (t) => [uniqueIndex("submission_unique").on(t.assignmentId, t.studentId)]);

export const quizzes = pgTable("quizzes", {
  id: id(),
  courseId: text("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  published: boolean("published").notNull().default(true),
  createdAt: createdAt(),
});

export const quizQuestions = pgTable("quiz_questions", {
  id: id(),
  quizId: text("quiz_id").notNull().references(() => quizzes.id, { onDelete: "cascade" }),
  prompt: text("prompt").notNull(),
  options: text("options").array().notNull(),
  correctIndex: integer("correct_index").notNull(),
  explanation: text("explanation"),
  order: integer("order").notNull().default(0),
});

export const quizAttempts = pgTable("quiz_attempts", {
  id: id(),
  quizId: text("quiz_id").notNull().references(() => quizzes.id, { onDelete: "cascade" }),
  studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  score: integer("score").notNull(),
  total: integer("total").notNull(),
  answers: jsonb("answers").$type<Record<string, number>>().notNull(),
  completedAt: ts("completed_at").notNull().defaultNow(),
});

// ───────────────────────── Examinations ─────────────────────────
export const assessments = pgTable("assessments", {
  id: id(),
  courseId: text("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  type: assessmentTypeEnum("type").notNull(),
  weight: integer("weight").notNull(),
  maxMarks: integer("max_marks").notNull().default(100),
  scheduledAt: ts("scheduled_at"),
  approvedAt: ts("approved_at"),
  approvedBy: text("approved_by"),
  publishedAt: ts("published_at"),
  publishedBy: text("published_by"),
  createdAt: createdAt(),
});

export const results = pgTable("results", {
  id: id(),
  assessmentId: text("assessment_id").notNull().references(() => assessments.id, { onDelete: "cascade" }),
  studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  marks: doublePrecision("marks"),
  status: resultStatusEnum("status").notNull().default("RECORDED"),
  comment: text("comment"),
  enteredById: text("entered_by_id"),
  updatedAt: ts("updated_at").notNull().defaultNow(),
}, (t) => [uniqueIndex("result_unique").on(t.assessmentId, t.studentId)]);

// ───────────────────────── Finance ─────────────────────────
export const feeItems = pgTable("fee_items", {
  id: id(),
  courseId: text("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  amount: money("amount").notNull(),
  currency: text("currency").notNull().default("USD"),
});

export const invoices = pgTable("invoices", {
  id: id(),
  number: text("number").notNull().unique(),
  studentId: text("student_id").notNull().references(() => students.id),
  description: text("description").notNull(),
  amount: money("amount").notNull(),
  concession: money("concession").notNull().default("0"),
  currency: text("currency").notNull().default("USD"),
  dueDate: ts("due_date"),
  status: invoiceStatusEnum("status").notNull().default("UNPAID"),
  createdAt: createdAt(),
});

export const payments = pgTable("payments", {
  id: id(),
  invoiceId: text("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  amount: money("amount").notNull(),
  method: text("method").notNull(),
  reference: text("reference"),
  status: paymentStatusEnum("status").notNull().default("PENDING"),
  manualEntry: boolean("manual_entry").notNull().default(true),
  receiptNumber: text("receipt_number").unique(),
  recordedById: text("recorded_by_id"),
  confirmedById: text("confirmed_by_id"),
  paidAt: ts("paid_at").notNull().defaultNow(),
  createdAt: createdAt(),
});

// ───────────────────────── Inventory ─────────────────────────
export const inventoryAssets = pgTable("inventory_assets", {
  id: id(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  location: text("location").notNull(),
  department: text("department").notNull(),
  condition: text("condition").notNull().default("Good"),
  quantity: integer("quantity").notNull().default(1),
  purchaseDate: ts("purchase_date"),
  purchaseCost: money("purchase_cost"),
  notes: text("notes"),
  createdAt: createdAt(),
});

export const maintenanceRecords = pgTable("maintenance_records", {
  id: id(),
  assetId: text("asset_id").notNull().references(() => inventoryAssets.id, { onDelete: "cascade" }),
  date: ts("date").notNull().defaultNow(),
  description: text("description").notNull(),
  cost: money("cost"),
  performedBy: text("performed_by"),
});

// ───────────────────────── Communications & governance ─────────────────────────
export const announcements = pgTable("announcements", {
  id: id(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  audience: audienceEnum("audience").notNull().default("ALL_STUDENTS"),
  courseId: text("course_id").references(() => courses.id, { onDelete: "cascade" }),
  authorId: text("author_id").references(() => users.id, { onDelete: "set null" }),
  publishedAt: ts("published_at").notNull().defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: id(),
  channel: text("channel").notNull().default("EMAIL"),
  to: text("to").notNull(),
  subject: text("subject").notNull(),
  html: text("html").notNull(),
  text: text("text").notNull(),
  status: notificationStatusEnum("status").notNull().default("PENDING"),
  attempts: integer("attempts").notNull().default(0),
  lastError: text("last_error"),
  sentAt: ts("sent_at"),
  relatedType: text("related_type"),
  relatedId: text("related_id"),
  createdAt: createdAt(),
});

export const auditLogs = pgTable("audit_logs", {
  id: id(),
  actorId: text("actor_id").references(() => users.id, { onDelete: "set null" }),
  actorName: text("actor_name"),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id"),
  meta: jsonb("meta"),
  createdAt: createdAt(),
}, (t) => [index("audit_entity_idx").on(t.entity, t.entityId)]);

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

// ───────────────────────── Relations (for db.query) ─────────────────────────
export const usersRelations = relations(users, ({ one }) => ({
  student: one(students, { fields: [users.id], references: [students.userId] }),
  staff: one(staff, { fields: [users.id], references: [staff.userId] }),
}));
export const studentsRelations = relations(students, ({ one, many }) => ({
  user: one(users, { fields: [students.userId], references: [users.id] }),
  enrolments: many(enrolments),
  results: many(results),
  invoices: many(invoices),
  submissions: many(submissions),
}));
export const staffRelations = relations(staff, ({ one, many }) => ({
  user: one(users, { fields: [staff.userId], references: [users.id] }),
  classGroups: many(classGroups),
}));
export const categoriesRelations = relations(courseCategories, ({ many }) => ({ courses: many(courses) }));
export const coursesRelations = relations(courses, ({ one, many }) => ({
  category: one(courseCategories, { fields: [courses.categoryId], references: [courseCategories.id] }),
  intakes: many(intakes),
  modules: many(modules),
  assignments: many(assignments),
  quizzes: many(quizzes),
  assessments: many(assessments),
  classGroups: many(classGroups),
  feeItems: many(feeItems),
  enrolments: many(enrolments),
}));
export const intakesRelations = relations(intakes, ({ one }) => ({
  course: one(courses, { fields: [intakes.courseId], references: [courses.id] }),
}));
export const adsRelations = relations(advertisements, ({ one }) => ({
  course: one(courses, { fields: [advertisements.courseId], references: [courses.id] }),
}));
export const newsRelations = relations(newsPosts, ({ many }) => ({ registrations: many(eventRegistrations) }));
export const eventRegRelations = relations(eventRegistrations, ({ one }) => ({
  news: one(newsPosts, { fields: [eventRegistrations.newsId], references: [newsPosts.id] }),
}));
export const enquiriesRelations = relations(enquiries, ({ one }) => ({
  course: one(courses, { fields: [enquiries.courseId], references: [courses.id] }),
}));
export const applicationsRelations = relations(applications, ({ one, many }) => ({
  course: one(courses, { fields: [applications.courseId], references: [courses.id] }),
  intake: one(intakes, { fields: [applications.intakeId], references: [intakes.id] }),
  ad: one(advertisements, { fields: [applications.adId], references: [advertisements.id] }),
  student: one(students, { fields: [applications.studentId], references: [students.id] }),
  documents: many(applicationDocuments),
  events: many(applicationEvents),
}));
export const appDocsRelations = relations(applicationDocuments, ({ one }) => ({
  application: one(applications, { fields: [applicationDocuments.applicationId], references: [applications.id] }),
}));
export const appEventsRelations = relations(applicationEvents, ({ one }) => ({
  application: one(applications, { fields: [applicationEvents.applicationId], references: [applications.id] }),
}));
export const classGroupsRelations = relations(classGroups, ({ one, many }) => ({
  course: one(courses, { fields: [classGroups.courseId], references: [courses.id] }),
  lecturer: one(staff, { fields: [classGroups.lecturerId], references: [staff.id] }),
  enrolments: many(enrolments),
  timetable: many(timetableSlots),
}));
export const timetableRelations = relations(timetableSlots, ({ one }) => ({
  classGroup: one(classGroups, { fields: [timetableSlots.classGroupId], references: [classGroups.id] }),
}));
export const enrolmentsRelations = relations(enrolments, ({ one }) => ({
  student: one(students, { fields: [enrolments.studentId], references: [students.id] }),
  course: one(courses, { fields: [enrolments.courseId], references: [courses.id] }),
  intake: one(intakes, { fields: [enrolments.intakeId], references: [intakes.id] }),
  classGroup: one(classGroups, { fields: [enrolments.classGroupId], references: [classGroups.id] }),
}));
export const modulesRelations = relations(modules, ({ one, many }) => ({
  course: one(courses, { fields: [modules.courseId], references: [courses.id] }),
  lessons: many(lessons),
}));
export const lessonsRelations = relations(lessons, ({ one }) => ({
  module: one(modules, { fields: [lessons.moduleId], references: [modules.id] }),
}));
export const assignmentsRelations = relations(assignments, ({ one, many }) => ({
  course: one(courses, { fields: [assignments.courseId], references: [courses.id] }),
  submissions: many(submissions),
}));
export const submissionsRelations = relations(submissions, ({ one }) => ({
  assignment: one(assignments, { fields: [submissions.assignmentId], references: [assignments.id] }),
  student: one(students, { fields: [submissions.studentId], references: [students.id] }),
}));
export const quizzesRelations = relations(quizzes, ({ one, many }) => ({
  course: one(courses, { fields: [quizzes.courseId], references: [courses.id] }),
  questions: many(quizQuestions),
  attempts: many(quizAttempts),
}));
export const quizQuestionsRelations = relations(quizQuestions, ({ one }) => ({
  quiz: one(quizzes, { fields: [quizQuestions.quizId], references: [quizzes.id] }),
}));
export const quizAttemptsRelations = relations(quizAttempts, ({ one }) => ({
  quiz: one(quizzes, { fields: [quizAttempts.quizId], references: [quizzes.id] }),
}));
export const assessmentsRelations = relations(assessments, ({ one, many }) => ({
  course: one(courses, { fields: [assessments.courseId], references: [courses.id] }),
  results: many(results),
}));
export const resultsRelations = relations(results, ({ one }) => ({
  assessment: one(assessments, { fields: [results.assessmentId], references: [assessments.id] }),
  student: one(students, { fields: [results.studentId], references: [students.id] }),
}));
export const feeItemsRelations = relations(feeItems, ({ one }) => ({
  course: one(courses, { fields: [feeItems.courseId], references: [courses.id] }),
}));
export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  student: one(students, { fields: [invoices.studentId], references: [students.id] }),
  payments: many(payments),
}));
export const paymentsRelations = relations(payments, ({ one }) => ({
  invoice: one(invoices, { fields: [payments.invoiceId], references: [invoices.id] }),
}));
export const assetsRelations = relations(inventoryAssets, ({ many }) => ({ maintenance: many(maintenanceRecords) }));
export const maintenanceRelations = relations(maintenanceRecords, ({ one }) => ({
  asset: one(inventoryAssets, { fields: [maintenanceRecords.assetId], references: [inventoryAssets.id] }),
}));
export const announcementsRelations = relations(announcements, ({ one }) => ({
  course: one(courses, { fields: [announcements.courseId], references: [courses.id] }),
  author: one(users, { fields: [announcements.authorId], references: [users.id] }),
}));
export const auditRelations = relations(auditLogs, ({ one }) => ({
  actor: one(users, { fields: [auditLogs.actorId], references: [users.id] }),
}));
