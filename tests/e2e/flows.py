"""
End-to-end acceptance checks for the GUVTC platform (spec §15).
Runs against a freshly seeded database and a running server:
    npm run db:seed && npm run build && npm start
    python3 tests/e2e/flows.py            # BASE_URL / CHROME env vars optional
"""
import asyncio, os, re, subprocess, sys, tempfile
from playwright.async_api import async_playwright

BASE = os.environ.get("BASE_URL", "http://localhost:3000")
CHROME = os.environ.get("CHROME")
SHOTS = os.environ.get("SHOTS")  # optional folder for screenshots
PW = "Guvtc@2026"
results = []

def psql(q):
    url = os.environ.get("DATABASE_URL", "postgresql://guvtc:guvtc@localhost:5432/guvtc")
    return subprocess.run(["psql", url, "-tAc", q], capture_output=True, text=True).stdout.strip()

def check(name, ok, detail=""):
    results.append((name, ok))
    print(("PASS " if ok else "FAIL ") + name + (f"  [{detail}]" if detail and not ok else ""))

async def shot(page, name):
    if SHOTS:
        await page.screenshot(path=f"{SHOTS}/{name}.png", full_page=True)

async def login(ctx, email):
    page = await ctx.new_page()
    await page.goto(f"{BASE}/login")
    await page.fill("#email", email)
    await page.fill("#password", PW)
    await page.click("button[type=submit]")
    await page.wait_for_load_state("networkidle")
    return page

async def main():
    pdf = tempfile.NamedTemporaryFile(suffix=".pdf", delete=False)
    pdf.write(b"%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n"); pdf.close()

    async with async_playwright() as p:
        browser = await p.chromium.launch(**({"executable_path": CHROME} if CHROME else {}))

        # ── Public website ─────────────────────────────────────────
        ctx = await browser.new_context(viewport={"width": 390, "height": 844})
        page = await ctx.new_page()
        await page.goto(BASE)
        check("Homepage shows live AI campaign", await page.locator("h1", has_text="New AI short courses").count() > 0)
        check("Expired advert is not shown", await page.locator("text=Graduation ceremony").count() == 0)
        check("Announcement bar advert shown", await page.locator("text=November intake applications close soon").count() > 0)
        check("Mobile apply bar present", await page.locator("a.btn-primary", has_text="Apply online").count() > 0)
        await shot(page, "01-home-mobile")
        await page.goto(f"{BASE}/courses")
        check("All 23 supplied courses listed", "23 courses" in await page.inner_text("main"))
        await page.fill("input[placeholder^='Search']", "cake")
        check("Course search filters", "1 course" in await page.inner_text("main"))
        await page.goto(f"{BASE}/student-life")
        check("Student life page is public", page.url.endswith("/student-life"))

        # Advert click tracking + attribution cookie
        ad_id = psql("SELECT id FROM advertisements WHERE slug='new-ai-short-courses'")
        clicks_before = int(psql(f"SELECT clicks FROM advertisements WHERE id='{ad_id}'"))
        await page.goto(f"{BASE}/go/{ad_id}")
        check("Advert click redirects to CTA", page.url.endswith("/ai-courses"))
        check("Advert click counted", int(psql(f"SELECT clicks FROM advertisements WHERE id='{ad_id}'")) == clicks_before + 1)

        # ── Online application ─────────────────────────────────────
        await page.goto(f"{BASE}/apply?course=ai-for-web-development")
        await page.click("text=Continue")
        await page.click("text=Continue")  # step 2 empty → errors
        check("Applicant form shows validation errors", await page.locator(".field-error").count() > 0)
        await page.fill("#firstName", "Tatenda"); await page.fill("#lastName", "Gumbo")
        await page.fill("#email", "tatenda.e2e@example.com"); await page.fill("#phone", "+263 77 555 1212")
        await page.fill("#address", "Senga, Gweru"); await page.fill("#nationalId", "08-123456A08")
        await page.click("text=Continue")
        await page.select_option("#highestQualification", "O Level")
        await page.fill("#emergencyName", "R. Gumbo"); await page.fill("#emergencyPhone", "+263 71 222 3333")
        await page.click("text=Continue")
        await page.set_input_files("#doc_id", pdf.name)
        await page.click("text=Continue")
        await page.check("input[name=consent]")
        await shot(page, "02-apply-review-mobile")
        await page.click("text=Submit application")
        await page.wait_for_url(re.compile(r"/apply/success"), timeout=30000)
        ref = (await page.locator(".font-display.text-4xl").inner_text()).strip()
        check("Application submitted with reference", ref.startswith("GUV-"), ref)
        await shot(page, "03-apply-success")
        row = psql(f"SELECT status, ad_id IS NOT NULL, (SELECT count(*) FROM application_documents d WHERE d.application_id=a.id) FROM applications a WHERE reference='{ref}'")
        check("Application stored with document and campaign attribution", row == "SUBMITTED|t|1", row)
        mails = psql(f"SELECT string_agg(\"to\" || ':' || status, ',' ORDER BY \"to\") FROM notifications WHERE subject LIKE '%{ref}%'")
        check("Applicant + admissions emails sent", "admissions@guvtc.example:SENT" in mails and "tatenda.e2e@example.com:SENT" in mails, mails)

        await page.goto(f"{BASE}/apply/track?ref={ref}")
        await page.fill("#email", "tatenda.e2e@example.com")
        await page.click("text=Check status")
        await page.wait_for_selector("text=We have your application")
        check("Applicant can track status", True)
        await page.fill("#email", "wrong@example.com"); await page.click("text=Check status")
        await page.wait_for_selector("text=could not find")
        check("Tracking requires matching email", True)
        await ctx.close()

        # ── Admissions review, decision, enrolment ─────────────────
        ctx = await browser.new_context(viewport={"width": 1366, "height": 900})
        page = await login(ctx, "admissions@guvtc.example")
        app_id = psql(f"SELECT id FROM applications WHERE reference='{ref}'")
        await page.goto(f"{BASE}/staff/admissions/{app_id}")
        await page.select_option("#status", "ACCEPTED")
        await page.fill("#note", "Welcome to the November intake.")
        await page.click("text=Save decision")
        await page.wait_for_selector("text=Status updated and applicant emailed")
        check("Admissions decision recorded and emailed", psql(f"SELECT count(*) FROM notifications WHERE \"to\"='tatenda.e2e@example.com' AND subject LIKE 'Offer%'") == "1")
        check("Decision logged with staff name", psql(f"SELECT actor_name FROM application_events WHERE application_id='{app_id}' AND to_status='ACCEPTED'") == "Admissions Office")
        await page.click("text=Enrol student")
        await page.wait_for_selector("text=Account set-up email sent")
        num = psql("SELECT s.student_number FROM students s JOIN users u ON u.id=s.user_id WHERE u.email='tatenda.e2e@example.com'")
        check("Applicant converted to enrolled student", num.startswith("GUV"), num)
        await shot(page, "04-staff-application")
        await page.goto(f"{BASE}/staff/adverts")
        check("Admissions officer cannot open advert manager", "denied=1" in page.url)
        await ctx.close()

        # ── Advertising workflow ───────────────────────────────────
        ctx = await browser.new_context(viewport={"width": 1366, "height": 900})
        page = await login(ctx, "marketing@guvtc.example")
        await page.goto(f"{BASE}/staff/adverts/new")
        await page.fill("#title", "Catering for events — January intake")
        await page.fill("#subtitle", "Plan, cook and serve for weddings and functions.")
        await page.select_option("#placement", "HERO")
        await page.fill("#ctaUrl", "/courses/catering")
        await page.click("text=Create draft")
        await page.wait_for_selector("text=Advert saved")
        await page.click("text=Send for approval")
        await page.wait_for_selector("text=Sent for approval")
        check("Marketing can create and submit advert", psql("SELECT status FROM advertisements WHERE title LIKE 'Catering for events%'") == "PENDING_APPROVAL")
        await page.goto(f"{BASE}/staff/results")
        check("Marketing cannot open results", "denied=1" in page.url)
        await ctx.close()

        ctx = await browser.new_context(viewport={"width": 1366, "height": 900})
        page = await login(ctx, "principal@guvtc.example")
        new_ad = psql("SELECT id FROM advertisements WHERE title LIKE 'Catering for events%'")
        await page.goto(f"{BASE}/staff/adverts/{new_ad}")
        await page.click("text=Approve & publish")
        await page.wait_for_selector("text=Approved and published")
        await shot(page, "05-staff-advert")
        await page.goto(BASE)
        html = await page.content()
        check("Approved advert appears on homepage", "Catering for events" in html)
        await page.goto(f"{BASE}/staff")
        await shot(page, "06-staff-dashboard")
        await ctx.close()

        # ── Marks: lecturer → exams approve → publish ──────────────
        ctx = await browser.new_context(viewport={"width": 1366, "height": 900})
        page = await login(ctx, "lecturer.ai@guvtc.example")
        pr = psql("SELECT id FROM assessments WHERE title='Practical project'")
        await page.goto(f"{BASE}/staff/results/{pr}")
        rudo = psql("SELECT s.id FROM students s JOIN users u ON u.id=s.user_id WHERE u.email='rudo.student@guvtc.example'")
        await page.fill(f"input[name=m_{rudo}]", "64")
        await page.click("text=Save marks")
        await page.wait_for_selector("text=saved")
        check("Lecturer enters marks", psql(f"SELECT marks FROM results WHERE assessment_id='{pr}' AND student_id='{rudo}'") == "64")
        dress = psql("SELECT id FROM courses WHERE slug='dress-making'")
        await page.goto(f"{BASE}/staff/elearning/{dress}")
        check("Lecturer blocked from courses they do not teach", "/staff/elearning?error" in page.url)
        await ctx.close()

        ctx = await browser.new_context(viewport={"width": 1366, "height": 900})
        page = await login(ctx, "tendai.student@guvtc.example")
        await page.goto(f"{BASE}/student/results")
        txt = await page.inner_text("main")
        check("Student sees published mark only (41/50, not 72)", "41/50" in txt and "72/100" not in txt)
        await ctx.close()

        ctx = await browser.new_context(viewport={"width": 1366, "height": 900})
        page = await login(ctx, "exams@guvtc.example")
        await page.goto(f"{BASE}/staff/results/{pr}")
        await page.click("text=Approve & lock marks")
        await page.wait_for_selector("text=Marks approved and locked")
        await page.click("text=Publish to students")
        await page.wait_for_selector("text=Published. Students can now see")
        check("Exams officer approves and publishes", psql(f"SELECT published_at IS NOT NULL FROM assessments WHERE id='{pr}'") == "t")
        await ctx.close()

        # ── Student portal ─────────────────────────────────────────
        ctx = await browser.new_context(viewport={"width": 1366, "height": 900})
        page = await login(ctx, "tendai.student@guvtc.example")
        check("Student lands on dashboard", page.url.endswith("/student"))
        await shot(page, "07-student-dashboard")
        await page.goto(f"{BASE}/student/results")
        check("Newly published mark visible to student", "72/100" in await page.inner_text("main"))
        await shot(page, "08-student-results")
        lesson = psql("SELECT id FROM lessons WHERE title='HTML structure with AI prompts'")
        await page.goto(f"{BASE}/student/lessons/{lesson}")
        await page.click("text=Mark as complete")
        await page.wait_for_timeout(1500)
        check("Lesson completion recorded", psql(f"SELECT count(*) FROM lesson_progress WHERE lesson_id='{lesson}'") == "1")
        await shot(page, "09-student-lesson")
        quiz = psql("SELECT id FROM quizzes LIMIT 1")
        await page.goto(f"{BASE}/student/quizzes/{quiz}")
        for fs in await page.locator("fieldset").all():
            await fs.locator("input[type=radio]").first.check()
        await page.click("text=Submit answers")
        await page.wait_for_selector("text=You scored")
        check("Quiz marked automatically", psql(f"SELECT count(*) FROM quiz_attempts WHERE quiz_id='{quiz}'") == "1")
        await page.goto(f"{BASE}/student/assignments")
        form = page.locator("article", has_text="One-page site for a local business")
        await form.locator("textarea").fill("Published at https://example.org — AI helped with the layout; I checked it on my phone.")
        await form.locator("button", has_text="Submit").click()
        await page.wait_for_selector("text=Submitted. You can update it")
        check("Assignment submitted", psql("SELECT count(*) FROM submissions s JOIN assignments a ON a.id=s.assignment_id WHERE a.title LIKE 'One-page%'") == "1")
        await page.goto(f"{BASE}/staff")
        check("Student cannot reach staff area", "/student" in page.url and "/staff" not in page.url)
        await ctx.close()

        ctx = await browser.new_context(viewport={"width": 1366, "height": 900})
        page = await login(ctx, "farai.student@guvtc.example")
        resp = await page.goto(f"{BASE}/student/lessons/{lesson}")
        check("Student cannot open lessons for a course they are not enrolled in", resp.status == 404)
        await ctx.close()

        # ── Finance ────────────────────────────────────────────────
        ctx = await browser.new_context(viewport={"width": 1366, "height": 900})
        page = await login(ctx, "finance@guvtc.example")
        inv = psql("SELECT id FROM invoices WHERE number='INV-2026-0001'")
        await page.goto(f"{BASE}/staff/finance/{inv}")
        check("Pending payment does not reduce balance", "$60.00" in await page.locator(".panel", has_text="Balance").first.inner_text())
        await page.click("button:has-text('Confirm')")
        await page.wait_for_selector("text=Receipt RC-")
        check("Confirmed payment issues receipt and updates balance", psql(f"SELECT status FROM invoices WHERE id='{inv}'") == "PART_PAID" and psql(f"SELECT count(*) FROM payments WHERE invoice_id='{inv}' AND status='CONFIRMED'") == "2")
        await shot(page, "10-staff-finance")
        await ctx.close()

        # ── Governance ─────────────────────────────────────────────
        for action in ["application.status", "application.enrol", "advert.approve", "result.enter", "assessment.publish", "payment.confirm"]:
            check(f"Audit log has {action}", int(psql(f"SELECT count(*) FROM audit_logs WHERE action='{action}'")) >= 1)
        await browser.close()

    failed = [n for n, ok in results if not ok]
    print(f"\n{len(results) - len(failed)}/{len(results)} checks passed")
    sys.exit(1 if failed else 0)

asyncio.run(main())
