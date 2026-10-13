/**
 * Seed logic (used by the CLI seed script and the first-run /setup page).
 *   npm run db:seed               → catalogue + settings + demo staff, students, adverts, intakes, results
 *   npm run db:seed -- --production → catalogue + settings + one super administrator only
 *
 * Demo intakes, adverts, news and people are illustrative and must be replaced with
 * GUVTC-approved information before launch.
 */
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { db, schema as s } from "./index";
import { CATALOGUE } from "./catalogue";
import { slugify } from "../lib/utils";

export const DEMO_PASSWORD = "Guvtc@2026";

export type SeedOptions = {
  /** true = catalogue + settings + one super admin; false = full demo data set */
  production: boolean;
  adminEmail: string;
  adminName?: string;
  /** Password for the super admin (and, in demo mode, for every demo account). */
  password: string;
  mustChangePassword?: boolean;
  admissionsEmail?: string;
  log?: (msg: string) => void;
};
const day = 86400000;
const at = (days: number, hour = 9) => {
  const d = new Date(Date.now() + days * day);
  d.setUTCHours(hour - 2, 0, 0, 0); // Harare is UTC+2
  return d;
};

export async function runSeed(opts: SeedOptions) {
  const PRODUCTION = opts.production;
  const log = opts.log ?? (() => {});
  log(PRODUCTION ? "Seeding production baseline…" : "Seeding demo data…");

  await db.execute(sql`TRUNCATE ${sql.raw(
    [
      "audit_logs", "notifications", "announcements", "maintenance_records", "inventory_assets", "payments", "invoices",
      "fee_items", "results", "assessments", "quiz_attempts", "quiz_questions", "quizzes", "submissions", "assignments",
      "attendance", "lesson_progress", "lessons", "modules", "timetable_slots", "enrolments", "class_groups",
      "application_events", "application_documents", "applications", "enquiries", "gallery_items", "event_registrations",
      "news_posts", "advertisements", "intakes", "courses", "course_categories", "password_resets", "staff", "students",
      "users", "settings",
    ].join(", "),
  )} CASCADE`);

  // ── Catalogue
  const courseBySlug: Record<string, string> = {};
  for (const [ci, cat] of CATALOGUE.entries()) {
    const [c] = await db.insert(s.courseCategories).values({
      name: cat.name, slug: cat.slug, description: cat.description, isAI: !!cat.isAI, sortOrder: ci,
    }).returning();
    for (const [i, course] of cat.courses.entries()) {
      const slug = slugify(course.name);
      const [row] = await db.insert(s.courses).values({
        slug, name: course.name, categoryId: c.id, summary: course.summary, description: course.description,
        outcomes: course.outcomes, deliveryModes: course.modes, equipment: course.equipment ?? null,
        entryRequirements: cat.isAI
          ? "Basic computer literacy. Introduction to Computers is recommended for complete beginners."
          : "Open to school leavers and adults. Requirements to be confirmed by Admissions.",
        featured: !!course.featured, sortOrder: i, status: "OPEN",
        faqs: [
          { q: "Do I need previous experience?", a: "No. The course starts from the basics. Tell us about any prior training on your application." },
          { q: "How do I apply?", a: "Choose Apply online, complete the form and upload your documents. You will receive a reference number by email." },
        ],
      }).returning();
      courseBySlug[slug] = row.id;
    }
  }

  // ── Settings
  await db.insert(s.settings).values([
    { key: "admissions_email", value: opts.admissionsEmail || "admissions@guvtc.example" },
  ]);

  // ── Super administrator
  const hash = await bcrypt.hash(opts.password, 12);
  const [admin] = await db.insert(s.users).values({
    email: opts.adminEmail.toLowerCase(), name: opts.adminName || "System Administrator",
    passwordHash: hash, role: "SUPER_ADMIN", mustChangePassword: opts.mustChangePassword ?? PRODUCTION,
  }).returning();
  await db.insert(s.staff).values({ userId: admin.id, staffNumber: "ST-0001", department: "Administration", title: "System administrator" });

  if (PRODUCTION) {
    log(`Done. Super administrator: ${admin.email}`);
    return { adminEmail: admin.email };
  }

  // ── Demo staff (one per role)
  const staffSpec = [
    ["principal", "Principal", "PRINCIPAL", "Management", "Principal"],
    ["admissions", "Admissions Office", "ADMISSIONS", "Admissions", "Admissions officer"],
    ["registrar", "Registrar", "REGISTRAR", "Administration", "Registrar"],
    ["lecturer.ai", "T. Moyo", "LECTURER", "Artificial intelligence", "Lecturer, AI short courses"],
    ["lecturer.fashion", "R. Ncube", "LECTURER", "Fashion & textiles", "Instructor, dressmaking"],
    ["exams", "Examinations Office", "EXAMS", "Examinations", "Examinations officer"],
    ["finance", "Finance Office", "FINANCE", "Finance", "Finance officer"],
    ["marketing", "Communications Office", "MARKETING", "Marketing", "Marketing & communications officer"],
    ["library", "Resource Centre", "LIBRARIAN", "Library", "Resource manager"],
  ] as const;
  const staffIds: Record<string, string> = {};
  const userIds: Record<string, string> = {};
  for (const [i, [handle, name, role, dept, title]] of staffSpec.entries()) {
    const [u] = await db.insert(s.users).values({ email: `${handle}@guvtc.example`, name, passwordHash: hash, role }).returning();
    const [st] = await db.insert(s.staff).values({
      userId: u.id, staffNumber: `ST-${String(i + 2).padStart(4, "0")}`, department: dept, title,
    }).returning();
    staffIds[handle] = st.id;
    userIds[handle] = u.id;
  }

  // ── Intakes for every open course
  const allCourses = await db.select().from(s.courses);
  const intakeByCourse: Record<string, string> = {};
  for (const c of allCourses) {
    const [it] = await db.insert(s.intakes).values({
      courseId: c.id, name: "November 2026 intake", startDate: at(20), applicationDeadline: at(14), capacity: 30,
    }).returning();
    intakeByCourse[c.id] = it.id;
    await db.insert(s.intakes).values({
      courseId: c.id, name: "January 2027 intake", startDate: at(84), applicationDeadline: at(75), capacity: 30,
    });
  }

  // Durations: only set where a demo value is useful. Real values must come from GUVTC.
  const webId = courseBySlug["ai-for-web-development"];
  const dressId = courseBySlug["dress-making"];
  const progId = courseBySlug["ai-for-programming"];

  // ── Advertisements (the spec's example campaign + others)
  await db.insert(s.advertisements).values([
    {
      slug: "new-ai-short-courses", title: "New AI short courses",
      subtitle: "Turn your ideas into digital skills.",
      description: "Learn AI for Programming, Web Development, Automation, Graphic Design and Video Creation. Apply online today.",
      ctaText: "Apply online today", ctaUrl: "/ai-courses", category: "Artificial intelligence",
      placement: "HERO", theme: "navy", status: "PUBLISHED", pinned: true, priority: 10,
      highlightCourses: ["AI for Programming", "AI for Web Development", "AI for Automation", "AI for Graphic Design", "AI for Video Content Creation"],
      startsAt: at(-10), expiresAt: at(60), intakeStart: at(20), applicationDeadline: at(14),
      createdById: userIds.marketing, approvedById: userIds.principal,
    },
    {
      slug: "dressmaking-november", title: "Sew your own label",
      subtitle: "Dress Making and Pattern Making — November intake.",
      description: "Measure, cut and sew garments that fit, in a fully equipped sewing workshop.",
      ctaText: "See fashion courses", ctaUrl: "/courses?category=fashion-textiles", courseId: dressId, category: "Fashion",
      placement: "HERO", theme: "gold", status: "PUBLISHED", priority: 5,
      startsAt: at(-5), expiresAt: at(30), intakeStart: at(20), applicationDeadline: at(14),
      createdById: userIds.marketing, approvedById: userIds.principal,
    },
    {
      slug: "catering-and-cakes", title: "Bake it. Cater it. Sell it.",
      subtitle: "Cake Making and Catering for home businesses and events.",
      ctaText: "See hospitality courses", ctaUrl: "/courses?category=hospitality-food", category: "Hospitality",
      placement: "HERO", theme: "mist", status: "PUBLISHED", priority: 3,
      startsAt: at(-3), expiresAt: at(45), createdById: userIds.marketing, approvedById: userIds.principal,
    },
    {
      slug: "november-deadline-bar", title: "November intake applications close soon",
      subtitle: "Apply online — you will receive a reference number by email.",
      ctaText: "Apply now", ctaUrl: "/apply", placement: "ANNOUNCEMENT_BAR", status: "PUBLISHED",
      startsAt: at(-2), expiresAt: at(14), applicationDeadline: at(14), createdById: userIds.marketing, approvedById: userIds.principal,
    },
    {
      slug: "motor-mechanics-promo", title: "Motor Mechanics workshop places",
      subtitle: "Service and repair light vehicles in our training workshop.",
      ctaText: "View course", ctaUrl: "/courses/motor-mechanics", placement: "COURSES", status: "PENDING_APPROVAL",
      createdById: userIds.marketing,
    },
    {
      slug: "graduation-2025-expired", title: "Graduation ceremony",
      subtitle: "Congratulations to all graduates.", placement: "HERO", status: "PUBLISHED",
      startsAt: at(-120), expiresAt: at(-60), createdById: userIds.marketing, approvedById: userIds.principal,
    },
  ]);

  // ── News, events, opportunities
  await db.insert(s.newsPosts).values([
    {
      slug: "open-day-november-2026", title: "Open day: see the workshops and meet instructors",
      excerpt: "Tour the sewing, salon, kitchen, motor and computer workshops and get help with your application.",
      body: "Prospective students and parents are welcome to tour our workshops, meet instructors and get help completing online applications. Bring your ID and certificates if you would like admissions staff to check them on the day.",
      kind: "EVENT", eventDate: at(9, 10), location: "GUVTC main campus, Gweru", registrable: true, published: true, publishedAt: at(-4),
    },
    {
      slug: "ai-department-launch", title: "GUVTC launches AI short courses",
      excerpt: "Seven new short courses teach practical uses of AI for programming, design, video, automation and documents.",
      body: "The new Artificial Intelligence department offers practical short courses for school leavers, workers and small business owners. Classes combine in-person lab sessions with live online lessons and recorded material on the eLearning portal.",
      kind: "NEWS", published: true, publishedAt: at(-12),
    },
    {
      slug: "fees-office-hours", title: "Notice: finance office hours during intake week",
      excerpt: "The finance office will open early during intake week to process registrations.",
      body: "During intake week the finance office will open from 07:30. Please bring your application reference number.",
      kind: "NOTICE", published: true, publishedAt: at(-1),
    },
    {
      slug: "attachment-opportunities-motor", title: "Industrial attachment places for motor mechanics students",
      excerpt: "Local garages have offered attachment places to students who complete the motor mechanics course.",
      body: "Students in good standing can apply through the registrar's office. Opportunities are verified by the centre before publication.",
      kind: "OPPORTUNITY", published: true, publishedAt: at(-6),
    },
  ]);

  await db.insert(s.galleryItems).values([
    { title: "Evening dress, final project", category: "Fashion", caption: "Dress Making students", consent: true },
    { title: "Three-tier celebration cake", category: "Hospitality", caption: "Cake Making", consent: true },
    { title: "Landing page for a Gweru bakery", category: "AI", caption: "AI for Web Development", consent: true },
    { title: "Engine overhaul", category: "Technical", caption: "Motor Mechanics workshop", consent: true },
    { title: "Box braids and cornrows", category: "Beauty", caption: "Braiding practical", consent: true },
    { title: "Steel window frames", category: "Technical", caption: "Window Frame Manufacture", consent: true },
  ]);

  // ── Courses: demo durations / fees for the courses used in the eLearning demo
  await db.execute(sql`UPDATE courses SET duration_text = '8 weeks (demo value)', duration_weeks = 8 WHERE id IN (${webId}, ${progId})`);
  await db.execute(sql`UPDATE courses SET duration_text = '3 months (demo value)', duration_weeks = 12 WHERE id = ${dressId}`);

  // ── Class groups & timetable
  const [webClass] = await db.insert(s.classGroups).values({ name: "AIWD — Nov 2026 A", courseId: webId, lecturerId: staffIds["lecturer.ai"], room: "Computer Lab 1", capacity: 25 }).returning();
  const [dressClass] = await db.insert(s.classGroups).values({ name: "DM — Nov 2026 A", courseId: dressId, lecturerId: staffIds["lecturer.fashion"], room: "Sewing Workshop", capacity: 20 }).returning();
  await db.insert(s.timetableSlots).values([
    { classGroupId: webClass.id, dayOfWeek: 1, startTime: "08:30", endTime: "11:00", room: "Computer Lab 1", activity: "Practical lab" },
    { classGroupId: webClass.id, dayOfWeek: 3, startTime: "14:00", endTime: "15:30", room: "Online", activity: "Live online lesson" },
    { classGroupId: webClass.id, dayOfWeek: 5, startTime: "08:30", endTime: "11:00", room: "Computer Lab 1", activity: "Project clinic" },
    { classGroupId: dressClass.id, dayOfWeek: 2, startTime: "08:00", endTime: "12:00", room: "Sewing Workshop", activity: "Practical" },
    { classGroupId: dressClass.id, dayOfWeek: 4, startTime: "08:00", endTime: "12:00", room: "Sewing Workshop", activity: "Practical" },
  ]);

  // ── Students
  const studentSpec = [
    ["tendai.student", "Tendai Chikwanha", [webId, dressId]],
    ["rudo.student", "Rudo Mpofu", [webId]],
    ["farai.student", "Farai Sibanda", [dressId]],
  ] as const;
  const studentIds: Record<string, string> = {};
  for (const [i, [handle, name, courseIds]] of studentSpec.entries()) {
    const [u] = await db.insert(s.users).values({ email: `${handle}@guvtc.example`, name, passwordHash: hash, role: "STUDENT" }).returning();
    const [st] = await db.insert(s.students).values({ userId: u.id, studentNumber: `GUV26${String(i + 1).padStart(4, "0")}`, phone: "+263 77 000 000" + i }).returning();
    studentIds[handle] = st.id;
    for (const cid of courseIds) {
      await db.insert(s.enrolments).values({
        studentId: st.id, courseId: cid, intakeId: intakeByCourse[cid],
        classGroupId: cid === webId ? webClass.id : dressClass.id, startDate: at(-21),
      });
    }
  }

  // ── eLearning content: AI for Web Development
  const [m1] = await db.insert(s.modules).values({ courseId: webId, title: "Getting started with AI-assisted web development", objectives: "Set up tools, understand how AI assistants work and their limits.", order: 1 }).returning();
  const [m2] = await db.insert(s.modules).values({ courseId: webId, title: "Building responsive pages", objectives: "HTML structure, CSS layout and mobile-first design with AI support.", order: 2 }).returning();
  const [m3] = await db.insert(s.modules).values({ courseId: webId, title: "Publishing your site", objectives: "Hosting, domains and keeping a site up to date.", order: 3 }).returning();
  const webLessons = await db.insert(s.lessons).values([
    { moduleId: m1.id, title: "Introduction to AI tools", type: "RECORDED", order: 1, durationMins: 18, videoUrl: "https://www.youtube-nocookie.com/embed/aircAruvnKk", content: "What AI assistants are, what they are good at, and where they make mistakes. Watch, then complete the reflection in your notes." },
    { moduleId: m1.id, title: "Course handbook and lab rules", type: "NOTES", order: 2, content: "Read the course handbook: attendance expectations, lab rules, how assessments are weighted and how to submit work on this portal." },
    { moduleId: m1.id, title: "Live: setting up your workspace", type: "LIVE", order: 3, startsAt: at(-7, 14), durationMins: 90, meetingUrl: "https://meet.google.com/demo-guvtc-aiwd", recordingUrl: "https://www.youtube-nocookie.com/embed/aircAruvnKk", content: "We install a code editor and set up an AI assistant together." },
    { moduleId: m2.id, title: "HTML structure with AI prompts", type: "RECORDED", order: 1, durationMins: 24, videoUrl: "https://www.youtube-nocookie.com/embed/aircAruvnKk", content: "Prompting an assistant for semantic HTML and checking what it produces." },
    { moduleId: m2.id, title: "Live: mobile-first layouts", type: "LIVE", order: 2, startsAt: at(1, 14), durationMins: 90, meetingUrl: "https://meet.google.com/demo-guvtc-aiwd", content: "Bring your draft page. We will make it work on a phone screen." },
    { moduleId: m2.id, title: "CSS layout cheat sheet", type: "NOTES", order: 3, content: "Flexbox and grid patterns you will use most often, with examples." },
    { moduleId: m3.id, title: "Live: publishing day", type: "LIVE", order: 1, startsAt: at(8, 14), durationMins: 120, meetingUrl: "https://meet.google.com/demo-guvtc-aiwd", content: "Publish your site and share the link with the class." },
  ]).returning();
  const [dm1] = await db.insert(s.modules).values({ courseId: dressId, title: "Measurements and fabric preparation", order: 1 }).returning();
  await db.insert(s.lessons).values([
    { moduleId: dm1.id, title: "Taking body measurements", type: "RECORDED", order: 1, durationMins: 15, videoUrl: "https://www.youtube-nocookie.com/embed/aircAruvnKk", content: "Watch the demonstration, then practise on a partner in class." },
    { moduleId: dm1.id, title: "Measurement record sheet", type: "NOTES", order: 2, content: "Print or copy this sheet into your workbook. Record measurements for three people before next class." },
    { moduleId: dm1.id, title: "Live: fabric grain and layout", type: "LIVE", order: 3, startsAt: at(2, 10), durationMins: 60, meetingUrl: "https://zoom.us/j/0000000000", content: "Short online session before the practical." },
  ]);

  // progress for Tendai
  await db.insert(s.lessonProgress).values([
    { lessonId: webLessons[0].id, studentId: studentIds["tendai.student"] },
    { lessonId: webLessons[1].id, studentId: studentIds["tendai.student"] },
    { lessonId: webLessons[2].id, studentId: studentIds["tendai.student"] },
  ]);

  // Assignments
  const [a1] = await db.insert(s.assignments).values({ courseId: webId, title: "One-page site for a local business", instructions: "Build a single responsive page for a real or imagined Gweru business. Submit a ZIP of your files or a PDF with screenshots and your published link. Explain which parts you wrote with AI help and how you checked them.", dueAt: at(5, 17), maxMarks: 50 }).returning();
  const [a2] = await db.insert(s.assignments).values({ courseId: webId, title: "Prompt journal", instructions: "Record five prompts you used this week, what the AI produced, and what you changed.", dueAt: at(-3, 17), maxMarks: 20 }).returning();
  await db.insert(s.assignments).values({ courseId: dressId, title: "Practical evidence: A-line skirt", instructions: "Upload clear photographs of your finished skirt: front, back, zip and hem. Your instructor will assess against the practical rubric.", practical: true, dueAt: at(10, 17), maxMarks: 100 });
  await db.insert(s.submissions).values({ assignmentId: a2.id, studentId: studentIds["tendai.student"], text: "Journal submitted in class notebook — summary attached.", submittedAt: at(-4), marks: 17, feedback: "Clear reflections. Next time note which outputs you rejected and why.", gradedAt: at(-2), gradedById: staffIds["lecturer.ai"] });
  void a1;

  // Quiz
  const [q] = await db.insert(s.quizzes).values({ courseId: webId, title: "Week 1 check: AI tools", description: "Five quick questions. You can retake it." }).returning();
  await db.insert(s.quizQuestions).values([
    { quizId: q.id, order: 1, prompt: "An AI assistant gives you code that looks correct. What should you do next?", options: ["Publish it straight away", "Test it and read it line by line", "Ask a friend if it looks fine", "Delete it"], correctIndex: 1, explanation: "AI output can be wrong in subtle ways. Always test and read it." },
    { quizId: q.id, order: 2, prompt: "Which HTML element best describes the main navigation?", options: ["<div>", "<nav>", "<span>", "<section>"], correctIndex: 1 },
    { quizId: q.id, order: 3, prompt: "Mobile-first design means…", options: ["Designing for phones first, then larger screens", "Only building apps", "Avoiding images", "Using small fonts"], correctIndex: 0 },
    { quizId: q.id, order: 4, prompt: "True or false: it is safe to paste a client's passwords into an AI chat.", options: ["True", "False"], correctIndex: 1, explanation: "Never share passwords or personal data with AI tools." },
    { quizId: q.id, order: 5, prompt: "Which CSS feature arranges items in rows and columns?", options: ["Grid", "Float", "Z-index", "Opacity"], correctIndex: 0 },
  ]);

  // Assessments & results
  const [ca] = await db.insert(s.assessments).values({ courseId: webId, title: "Continuous assessment 1", type: "CONTINUOUS", weight: 30, maxMarks: 50, scheduledAt: at(-10), approvedAt: at(-5), approvedBy: "Examinations Office", publishedAt: at(-4), publishedBy: "Examinations Office" }).returning();
  const [pr] = await db.insert(s.assessments).values({ courseId: webId, title: "Practical project", type: "PRACTICAL", weight: 40, maxMarks: 100, scheduledAt: at(15) }).returning();
  const [fe] = await db.insert(s.assessments).values({ courseId: webId, title: "Final examination", type: "FINAL_EXAM", weight: 30, maxMarks: 100, scheduledAt: at(25) }).returning();
  await db.insert(s.results).values([
    { assessmentId: ca.id, studentId: studentIds["tendai.student"], marks: 41, enteredById: staffIds["lecturer.ai"], comment: "Strong start." },
    { assessmentId: ca.id, studentId: studentIds["rudo.student"], marks: 33, enteredById: staffIds["lecturer.ai"] },
    { assessmentId: pr.id, studentId: studentIds["tendai.student"], marks: 72, enteredById: staffIds["lecturer.ai"] },
  ]);
  void fe;
  const [dca] = await db.insert(s.assessments).values({ courseId: dressId, title: "Practical: measurements & cutting", type: "PRACTICAL", weight: 50, maxMarks: 100, approvedAt: at(-3), approvedBy: "Examinations Office", publishedAt: at(-2), publishedBy: "Examinations Office" }).returning();
  await db.insert(s.assessments).values({ courseId: dressId, title: "Final practical", type: "FINAL_EXAM", weight: 50, maxMarks: 100, scheduledAt: at(70) });
  await db.insert(s.results).values([
    { assessmentId: dca.id, studentId: studentIds["tendai.student"], marks: 68, enteredById: staffIds["lecturer.fashion"] },
    { assessmentId: dca.id, studentId: studentIds["farai.student"], marks: 81, enteredById: staffIds["lecturer.fashion"] },
  ]);

  // Attendance (last 2 weeks for web class)
  const dates = [-14, -12, -9, -7, -5, -2].map((d) => at(d).toISOString().slice(0, 10));
  for (const date of dates) {
    for (const h of ["tendai.student", "rudo.student"] as const) {
      await db.insert(s.attendance).values({
        studentId: studentIds[h], classGroupId: webClass.id, date,
        status: h === "rudo.student" && date === dates[2] ? "ABSENT" : "PRESENT", recordedById: staffIds["lecturer.ai"],
      });
    }
  }

  // Fees (demo amounts — replace with approved fee structure)
  await db.insert(s.feeItems).values([
    { courseId: webId, name: "Tuition (demo amount)", amount: "120.00" },
    { courseId: dressId, name: "Tuition (demo amount)", amount: "90.00" },
  ]);
  const [inv1] = await db.insert(s.invoices).values({ number: "INV-2026-0001", studentId: studentIds["tendai.student"], description: "AI for Web Development — tuition", amount: "120.00", dueDate: at(7), status: "PART_PAID" }).returning();
  await db.insert(s.invoices).values({ number: "INV-2026-0002", studentId: studentIds["rudo.student"], description: "AI for Web Development — tuition", amount: "120.00", dueDate: at(7) });
  const [inv3] = await db.insert(s.invoices).values({ number: "INV-2026-0003", studentId: studentIds["farai.student"], description: "Dress Making — tuition", amount: "90.00", dueDate: at(7), status: "PAID" }).returning();
  await db.insert(s.payments).values([
    { invoiceId: inv1.id, amount: "60.00", method: "CASH", status: "CONFIRMED", receiptNumber: "RC-2026-0001", recordedById: userIds.finance, confirmedById: userIds.finance, paidAt: at(-15) },
    { invoiceId: inv1.id, amount: "30.00", method: "ECOCASH", reference: "MP2610.1234.A", status: "PENDING", recordedById: userIds.finance, paidAt: at(-1) },
    { invoiceId: inv3.id, amount: "90.00", method: "BANK", reference: "CBZ-778812", status: "CONFIRMED", receiptNumber: "RC-2026-0002", recordedById: userIds.finance, confirmedById: userIds.finance, paidAt: at(-10) },
  ]);

  // Inventory
  const assets = await db.insert(s.inventoryAssets).values([
    { code: "SEW-001", name: "Industrial straight-stitch sewing machine", category: "Sewing machines", location: "Sewing Workshop", department: "Fashion & textiles", condition: "Good", quantity: 12 },
    { code: "SEW-014", name: "Overlocker", category: "Sewing machines", location: "Sewing Workshop", department: "Fashion & textiles", condition: "Needs repair", quantity: 1 },
    { code: "ICT-001", name: "Desktop computer", category: "Computers", location: "Computer Lab 1", department: "Artificial intelligence", condition: "Good", quantity: 25 },
    { code: "ICT-030", name: "Projector", category: "AV equipment", location: "Computer Lab 1", department: "Artificial intelligence", condition: "Fair", quantity: 1 },
    { code: "SAL-001", name: "Hood hair dryer", category: "Salon equipment", location: "Salon", department: "Beauty", condition: "Good", quantity: 4 },
    { code: "MEC-001", name: "Hydraulic vehicle lift", category: "Mechanical tools", location: "Motor Workshop", department: "Technical trades", condition: "Good", quantity: 1 },
    { code: "MEC-022", name: "Arc welding set", category: "Mechanical tools", location: "Fabrication Workshop", department: "Technical trades", condition: "Good", quantity: 6 },
    { code: "CAT-001", name: "Commercial oven", category: "Catering equipment", location: "Training Kitchen", department: "Hospitality", condition: "Good", quantity: 2 },
  ]).returning();
  await db.insert(s.maintenanceRecords).values({ assetId: assets[1].id, description: "Tension assembly worn — awaiting spare part", performedBy: "Workshop technician", date: at(-6) });

  // Announcements
  await db.insert(s.announcements).values([
    { title: "Welcome to the eLearning portal", body: "Your lessons, notes, assignments and published results are all here. If you cannot see a course you are registered for, contact the registrar.", audience: "ALL_STUDENTS", authorId: userIds.registrar, publishedAt: at(-20) },
    { title: "Bring your draft page to Thursday's live class", body: "We will review mobile layouts together. Join from the Live classes tab.", audience: "COURSE", courseId: webId, authorId: userIds["lecturer.ai"], publishedAt: at(-1) },
  ]);

  // Sample applications
  const sampleApps = [
    { first: "Nyasha", last: "Dube", course: webId, status: "SUBMITTED" as const },
    { first: "Kudzai", last: "Banda", course: courseBySlug["cake-making"], status: "UNDER_REVIEW" as const },
    { first: "Blessing", last: "Moyo", course: courseBySlug["motor-mechanics"], status: "ACCEPTED" as const },
    { first: "Chipo", last: "Ndlovu", course: courseBySlug["ai-for-graphic-design"], status: "CORRECTIONS_REQUESTED" as const },
  ];
  for (const [i, a] of sampleApps.entries()) {
    const [app] = await db.insert(s.applications).values({
      reference: `GUV-26-${(100231 + i * 7).toString(36).toUpperCase()}`,
      courseId: a.course, intakeId: intakeByCourse[a.course], status: a.status,
      firstName: a.first, lastName: a.last, email: `${a.first.toLowerCase()}@example.com`, phone: "+263 77 123 45" + i,
      address: "Mkoba, Gweru", highestQualification: "O Level", consent: true, campaignSource: i === 0 ? "facebook" : null,
      submittedAt: at(-6 + i),
    }).returning();
    await db.insert(s.applicationEvents).values({ applicationId: app.id, toStatus: "SUBMITTED", actorName: "Applicant", createdAt: at(-6 + i) });
    if (a.status !== "SUBMITTED")
      await db.insert(s.applicationEvents).values({ applicationId: app.id, fromStatus: "SUBMITTED", toStatus: a.status, actorId: userIds.admissions, actorName: "Admissions Office", note: a.status === "CORRECTIONS_REQUESTED" ? "Please upload a clearer copy of your national ID." : null });
  }

  await db.insert(s.enquiries).values([
    { name: "Precious M.", email: "precious@example.com", phone: "+263 71 555 0101", courseId: courseBySlug["cake-making"], message: "Is there a weekend class for Cake Making?", consent: true, source: "contact-form" },
    { name: "Tafadzwa K.", email: "tafadzwa@example.com", courseId: progId, message: "Do I need my own laptop for AI for Programming?", consent: true, source: "course-page" },
  ]);

  log("Demo seed complete.");
  return { adminEmail: admin.email };
}
