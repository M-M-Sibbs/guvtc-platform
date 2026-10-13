# GUVTC Digital Campus

The website, advertising manager, online admissions, eLearning portal and school management system for **Gweru Urban Vocational Training Centre** — one Next.js application on one PostgreSQL database.

| Area | What it does |
|---|---|
| **Public website** | Home page with rotating campaign adverts and a live "Now enrolling" deadline board, searchable course catalogue (23 courses, 6 departments), AI short-course landing page, course pages with FAQs and structured data, admissions guide, news/events with open-day registration, student work gallery, contact & enquiry form, map, optional WhatsApp, sitemap and SEO metadata. |
| **Advertising manager** | Staff create adverts (title, copy, image, video, course list, button, placement, schedule, deadline, priority, pinning) without code. Draft → awaiting approval → published / rejected / archived. Scheduled adverts go live by themselves and expired adverts disappear automatically. Clicks, enquiries and completed applications are attributed to each advert. |
| **Online admissions** | 5-step mobile-friendly application with saved drafts, document uploads, clear validation, a unique reference (e.g. `GUV-26-7KQ4XM`), confirmation email to the applicant and notification to the admissions inbox, public status tracker, and a "send more information" flow. Admissions staff review, record decisions (emailed and logged) and enrol accepted applicants in one click. |
| **eLearning portal** | Student dashboard (My courses · Live classes · Notes & tasks · My results), live lessons with Google Meet/Zoom links that open 15 min before start and record attendance on join, recorded lessons with resume/complete tracking, downloadable notes via expiring links, assignments with file/photo evidence for practical trades, auto-marked quizzes, published results with weighted final grade and printable statement, timetable, fees and notices. |
| **School management** | Students, courses & intakes, class groups and timetable with clash detection, eLearning content, attendance registers, assessments (lecturer enters → exams officer approves/locks → publishes), fees & receipts (pending vs confirmed), inventory & workshop maintenance, announcements, reports with CSV export, email delivery log with retry, users & roles, settings, full audit log. |

## Quick start

Requirements: Node.js 20+ and PostgreSQL 14+.

```bash
cp .env.example .env            # then edit AUTH_SECRET at least
docker compose up -d            # or use your own PostgreSQL and set DATABASE_URL
npm install
npm run db:migrate              # creates the tables
npm run db:seed                 # catalogue + demo data
npm run dev                     # http://localhost:3000
```

### Demo accounts (password `Guvtc@2026`)

| Email | Role |
|---|---|
| admin@guvtc.example | Super administrator |
| principal@guvtc.example | Principal — approves adverts, sees reports |
| admissions@guvtc.example | Admissions officer |
| registrar@guvtc.example | Registrar |
| marketing@guvtc.example | Marketing & communications |
| lecturer.ai@guvtc.example | Lecturer (AI for Web Development) |
| lecturer.fashion@guvtc.example | Lecturer (Dress Making) |
| exams@guvtc.example | Examinations officer |
| finance@guvtc.example | Finance officer |
| tendai.student@guvtc.example | Student (enrolled in two courses) |

Demo intakes, adverts, news, fees and people are illustrative. **Do not use the demo seed in production** — see below.

## Before launch — what GUVTC must supply / configure

1. **Email** — set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`. Then in *Staff → Settings* set the official **admissions inbox** and **sender address**. Until SMTP is set, emails are saved to `storage/outbox/` and a warning shows on the dashboard.
2. **Branding** — replace the placeholder wordmark in `src/components/ui/wordmark.tsx` with the official logo/crest once approved (put files in `public/branding/`).
3. **Courses** — for each course confirm the duration, entry requirements, fees and intake dates in *Staff → Courses & intakes*. Durations are deliberately left empty ("confirmed on enquiry") rather than assuming 2 weeks–6 months for everything. The AI course descriptions are proposed copy to align with the approved syllabus.
4. **Contact details, address, map and WhatsApp** — *Staff → Settings*.
5. **Grading scale** — `src/lib/grading.ts` holds the default bands (Distinction ≥75, Merit ≥65, Pass ≥50). Replace with the official scale.
6. **Application rules** — choose which fields and documents are required in *Staff → Settings*.
7. **Privacy** — `/privacy` is a draft; have it checked against the Cyber and Data Protection Act and government ICT policy.
8. **Photographs** — upload approved photos for adverts and the gallery (the gallery requires recorded consent).

## Deploying to Vercel (recommended)

Everything is done in the browser; no terminal needed.

1. **Put the code on GitHub** as a *private* repository (GitHub Desktop: *File → Add local repository* → choose this folder → *Publish repository*, keep "private" ticked).
2. **Import into Vercel**: vercel.com → *Add New → Project* → pick the repository → **don't deploy yet**. Open *Environment Variables* and add:
   - `AUTH_SECRET`: 40+ random characters (use a password generator)
   - `SETUP_CODE`: any secret phrase (used once in step 5)
   - `CRON_SECRET`: another random string
   Then click **Deploy**. The build succeeds, but the site can't work until steps 3–5 are done.
3. **Add the database**: project → *Storage* → *Create Database* → **Neon** (Postgres) → connect it to the project. This fills in `DATABASE_URL`.
4. **Add file storage**: *Storage* → *Create* → **Blob** → access **Private** → connect to the project.
5. **Redeploy** (*Deployments* → ⋯ → *Redeploy*). The build runs the database migrations automatically. Then open `https://<your-project>.vercel.app/setup`, enter your `SETUP_CODE`, and create the administrator account. Tick "Add demo content" if you want to try everything first.
6. **Email**: add `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (e.g. a free [Resend](https://resend.com) or Brevo account, or the school's Google Workspace / Microsoft 365) and redeploy. Until then the site works but emails are kept in *Staff → Email log* as "failed"; press *Retry failed* once SMTP is set.
7. **Domain** (optional): *Settings → Domains* → add e.g. `www.guvtc.ac.zw`, then set `APP_URL` to it and redeploy.

Notes:
- Uploads go straight from the browser to the private Blob store, so large files aren't affected by Vercel's 4.5 MB request limit. Documents are only reachable through signed, expiring links.
- `vercel.json` runs `/api/jobs` daily (email retries, advert archiving). Vercel's Hobby plan allows daily crons; on Pro you can make it every 15 minutes.
- If you demo the platform with demo content, run setup again on a fresh database before the real launch, or deactivate the demo accounts.

## Other hosting (VPS / government data centre)

```bash
npm ci
npm run db:migrate
npm run db:seed -- --production   # catalogue + settings + ONE super admin (SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD)
npm run build
npm start
```

Or skip the seed and open `/setup` in the browser. Uploaded files are stored in `STORAGE_DIR`; keep it on a persistent, backed-up volume. Call `GET /api/jobs` with `Authorization: Bearer $CRON_SECRET` every 10–15 minutes from cron. Back up with a daily `pg_dump` plus `STORAGE_DIR`.

## How it is built

- **Next.js 15** (App Router, Server Components, Server Actions) + **TypeScript**
- **PostgreSQL** with **Drizzle ORM** — schema in `src/db/schema.ts`, SQL migrations in `drizzle/`
- **Tailwind CSS v4** with a small design system (`src/app/globals.css`): navy `#102A43`, gold `#D9B56D`, mist `#EAF0F6`, white; Source Serif 4 for headings, Public Sans (a typeface designed for government services) for text
- **Zod** validation, **jose** signed session cookies, **bcrypt** password hashing, **Nodemailer** for SMTP, **Recharts** for dashboards
- **Vitest** unit tests and a **Playwright** end-to-end acceptance script

> The specification recommended Prisma. Drizzle was used instead because it is pure TypeScript with no engine binaries to download, which makes it easier to deploy on restricted government networks; the data model is the one in the specification. Switching back is possible but not necessary.

```
src/
  app/(public)/        website, courses, AI courses, apply, track, news, contact
  app/(auth)/          login, password reset, change password
  app/student/         eLearning portal
  app/staff/           school management (each page checks a capability)
  app/actions/         server actions (all authorisation is enforced here)
  app/api/             signed file downloads, public media, background jobs
  db/                  schema, catalogue, seed
  lib/                 auth, permissions (RBAC), email, storage, grading, finance, audit, analytics
  components/          UI, public site, portal, staff and student components
tests/unit/            grading, finance, timetable, permissions
tests/e2e/flows.py     41 acceptance checks from spec §15
```

### Security model

- Every staff page and server action checks a **capability** (`src/lib/permissions.ts`) on the server — hiding a button is never the only protection. The permission matrix is visible in *Staff → Users & roles*.
- Lecturers only manage courses they are assigned to through class groups; students only see courses they are enrolled in.
- Students see a mark only after the examinations office **approves and publishes** it; approved marks are locked and corrections need a reason recorded in the audit log.
- Fee balances count **confirmed** payments only; pending and reversed entries are shown but never reduce what is owed.
- Uploaded documents live outside `/public` and are served through **signed, expiring links**; opening an applicant's documents is logged.
- Accounts lock for 15 minutes after 5 failed sign-ins; password reset tokens are single-use and hashed; new accounts set their own password via an emailed link.
- Public forms have rate limits and a honeypot; CSV exports are permission-checked, formula-injection safe and logged.
- Admission decisions and grading are never automated.

### File storage

`src/lib/storage.ts` is the only module that touches files. When a Vercel Blob store is connected (`BLOB_READ_WRITE_TOKEN`), files go to the private store and browsers upload directly after `/api/upload` checks who they are and where they may upload. Otherwise files are written to `STORAGE_DIR`. To use S3 / Cloudflare R2 instead, implement the same functions with the AWS SDK.

### Rate limiting

`src/lib/rate-limit.ts` is in-memory, which is right for a single server. If you run several instances, back it with Redis.

## Tests

```bash
npm test                                   # unit tests
npm run db:seed && npm run build && npm start
python3 tests/e2e/flows.py                 # end-to-end acceptance (pip install playwright && playwright install chromium)
```

The end-to-end script covers the launch checklist: course search, scheduled/expired adverts, the full application with upload, both emails, tracking, admissions decision and enrolment, advert approval, marks entry → approval → publication, students only seeing published results and their own courses, lesson progress, quizzes, assignment submission, payment confirmation and receipts, role restrictions and audit entries.

## Suggested next phases

- SMS / WhatsApp notifications through an approved provider
- Online payments (e.g. Paynow, EcoCash) feeding the existing pending → confirmed workflow
- Certificates of completion generated from completed enrolments
- Discussion boards per course
- Progressive web app (offline notes)
- Admissions enquiry assistant answering only from approved course information
