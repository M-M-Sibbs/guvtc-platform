import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, ne, asc } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { getCourseBySlug } from "@/lib/queries";
import { PageHeader, Badge } from "@/components/ui/ui";
import { Icon } from "@/components/ui/icons";
import { EnquiryForm } from "@/components/public/enquiry-form";
import { ShareButtons } from "@/components/public/share-buttons";
import { DELIVERY_LABELS, fmtDate, fmtMoney } from "@/lib/utils";
import { appUrl } from "@/lib/app-url";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await getCourseBySlug((await params).slug);
  if (!c) return {};
  return {
    title: `${c.name} short course`,
    description: c.summary,
    alternates: { canonical: `/courses/${c.slug}` },
    openGraph: { title: `${c.name} — GUVTC`, description: c.summary, images: c.coverImage ? [c.coverImage] : undefined },
  };
}

export default async function CoursePage({ params }: Props) {
  const course = await getCourseBySlug((await params).slug);
  if (!course) notFound();
  const related = await db.select({ name: s.courses.name, slug: s.courses.slug, summary: s.courses.summary }).from(s.courses)
    .where(and(eq(s.courses.categoryId, course.categoryId), ne(s.courses.id, course.id), eq(s.courses.status, "OPEN")))
    .orderBy(asc(s.courses.sortOrder)).limit(3);
  const next = course.intakes[0];
  const url = `${appUrl()}/courses/${course.slug}`;
  const lecturers = course.classGroups.map((g) => g.lecturer).filter((l): l is NonNullable<typeof l> => !!l && l.showOnWebsite);
  const confirmedFees = course.feesText || (course.feeItems.length > 0 && !course.feeItems.some((f) => /demo/i.test(f.name)));

  const jsonLd = {
    "@context": "https://schema.org", "@type": "Course", name: course.name, description: course.summary,
    provider: { "@type": "EducationalOrganization", name: "Gweru Urban Vocational Training Centre", sameAs: appUrl() },
    ...(next ? { hasCourseInstance: { "@type": "CourseInstance", startDate: next.startDate.toISOString(), courseMode: course.deliveryModes.includes("IN_PERSON") ? "onsite" : "online" } } : {}),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageHeader title={course.name} lead={course.summary}
        crumbs={[{ href: "/", label: "Home" }, { href: "/courses", label: "Courses" }, { href: `/courses?category=${course.category.slug}`, label: course.category.name }]}>
        <div className="mt-8 flex flex-wrap gap-3">
          {course.status === "OPEN"
            ? <Link href={`/apply?course=${course.slug}`} className="btn btn-gold">Apply now</Link>
            : <span className="btn btn-ghost-light" aria-disabled>Enrolment closed</span>}
          <a href="#enquire" className="btn btn-ghost-light">Enquire</a>
        </div>
      </PageHeader>

      <div className="container-page grid gap-12 py-12 lg:grid-cols-[1fr_340px]">
        <article>
          <section>
            <h2 className="text-2xl font-semibold">About the course</h2>
            <div className="prose-guvtc mt-4 text-lg text-navy-700"><p>{course.description}</p></div>
          </section>

          {course.videoUrl && (
            <section className="mt-10">
              <h2 className="text-2xl font-semibold">Course introduction</h2>
              <iframe className="mt-4 aspect-video w-full rounded-md" src={course.videoUrl} title={`${course.name} introduction`} allowFullScreen loading="lazy" />
            </section>
          )}

          <section className="mt-10">
            <h2 className="text-2xl font-semibold">What you will be able to do</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {course.outcomes.map((o) => (
                <li key={o} className="flex gap-3 rounded-md bg-mist-2 p-4"><Icon.Check className="mt-0.5 shrink-0 text-success" />{o}</li>
              ))}
            </ul>
          </section>

          <section className="mt-10 grid gap-8 sm:grid-cols-2">
            <div>
              <h2 className="text-xl font-semibold">Entry requirements</h2>
              <p className="mt-2 text-navy-700">{course.entryRequirements ?? "To be confirmed by Admissions."}</p>
            </div>
            <div>
              <h2 className="text-xl font-semibold">Equipment</h2>
              <p className="mt-2 text-navy-700">{course.equipment ?? "Workshop equipment is provided. Any personal kit is listed at registration."}</p>
            </div>
          </section>

          {lecturers.length > 0 && (
            <section className="mt-10">
              <h2 className="text-2xl font-semibold">Your instructors</h2>
              <ul className="mt-4 space-y-3">
                {lecturers.map((l) => <li key={l.id}><strong>{l.user.name}</strong> — {l.title}{l.bio && <p className="text-sm text-slate">{l.bio}</p>}</li>)}
              </ul>
            </section>
          )}

          {course.faqs.length > 0 && (
            <section className="mt-10">
              <h2 className="text-2xl font-semibold">Questions people ask</h2>
              <div className="mt-4 divide-y divide-line border-y border-line">
                {course.faqs.map((f) => (
                  <details key={f.q} className="group py-4">
                    <summary className="cursor-pointer list-none font-semibold marker:hidden">
                      <span className="flex justify-between gap-4">{f.q}<span className="text-gold-ink group-open:rotate-45 transition-transform" aria-hidden>+</span></span>
                    </summary>
                    <p className="mt-2 text-navy-700">{f.a}</p>
                  </details>
                ))}
              </div>
            </section>
          )}

          <section id="enquire" className="mt-12 scroll-mt-28 rounded-md border border-line p-6">
            <h2 className="text-2xl font-semibold">Ask about {course.name}</h2>
            <div className="mt-5"><EnquiryForm courses={[{ id: course.id, name: course.name }]} defaultCourseId={course.id} source="course-page" /></div>
          </section>
        </article>

        <aside className="space-y-6 lg:sticky lg:top-32 lg:self-start">
          <div className="panel overflow-hidden">
            <div className="bg-mist px-5 py-3 font-semibold">Course facts</div>
            <dl className="divide-y divide-line text-sm">
              <div className="flex justify-between gap-4 px-5 py-3"><dt className="text-slate">Duration</dt><dd className="text-right font-medium">{course.durationText ?? "Confirmed on enquiry"}</dd></div>
              <div className="flex justify-between gap-4 px-5 py-3"><dt className="text-slate">Delivery</dt><dd className="text-right font-medium">{course.deliveryModes.map((m) => DELIVERY_LABELS[m]).join(", ")}</dd></div>
              <div className="flex justify-between gap-4 px-5 py-3"><dt className="text-slate">Department</dt><dd className="text-right font-medium">{course.category.name}</dd></div>
              <div className="flex justify-between gap-4 px-5 py-3"><dt className="text-slate">Fees</dt>
                <dd className="text-right font-medium">
                  {course.feesText ?? (confirmedFees ? course.feeItems.map((f) => `${f.name}: ${fmtMoney(f.amount, f.currency)}`).join("; ") : "Available from Admissions")}
                </dd></div>
              <div className="flex justify-between gap-4 px-5 py-3"><dt className="text-slate">Status</dt><dd>{course.status === "OPEN" ? <Badge tone="success">Enrolling</Badge> : <Badge>Closed</Badge>}</dd></div>
            </dl>
          </div>
          <div className="panel p-5">
            <h2 className="font-display text-lg font-semibold">Upcoming intakes</h2>
            {course.intakes.length === 0 ? <p className="mt-2 text-sm text-slate">No intake is scheduled yet. Send an enquiry and we will tell you when the next one opens.</p> : (
              <ul className="mt-3 space-y-3">
                {course.intakes.map((i) => (
                  <li key={i.id} className="text-sm">
                    <p className="font-semibold">{i.name}</p>
                    <p className="text-slate">Starts {fmtDate(i.startDate)}{i.applicationDeadline && ` · apply by ${fmtDate(i.applicationDeadline)}`}</p>
                  </li>
                ))}
              </ul>
            )}
            {course.status === "OPEN" && <Link href={`/apply?course=${course.slug}`} className="btn btn-primary mt-5 w-full">Apply now</Link>}
          </div>
          <ShareButtons url={url} title={`${course.name} at GUVTC`} />
          {related.length > 0 && (
            <div>
              <h2 className="font-display text-lg font-semibold">Related courses</h2>
              <ul className="mt-3 space-y-3">
                {related.map((r) => <li key={r.slug}><Link className="font-medium underline-offset-4 hover:underline" href={`/courses/${r.slug}`}>{r.name}</Link><p className="text-sm text-slate">{r.summary}</p></li>)}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
