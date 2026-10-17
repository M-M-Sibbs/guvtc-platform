import Link from "next/link";
import { getCatalogue, getLiveAds, getPublishedNews, getUpcomingIntakes } from "@/lib/queries";
import { toFinder } from "@/lib/catalogue-view";
import { getSettings } from "@/lib/settings";
import { HeroCampaign, type HeroAd } from "@/components/public/hero-campaign";
import { CourseFinder } from "@/components/public/course-finder";
import { EnquiryForm } from "@/components/public/enquiry-form";
import { Icon, CATEGORY_ICON } from "@/components/ui/icons";
import { db, schema as s } from "@/db";
import { eq, desc } from "drizzle-orm";
import { daysUntil, fmtDate, telHref } from "@/lib/utils";

export default async function HomePage() {
  const [heroAds, courseAds, intakes, catalogue, news, settings, gallery] = await Promise.all([
    getLiveAds("HERO", 5),
    getLiveAds("COURSES", 2),
    getUpcomingIntakes(6),
    getCatalogue(),
    getPublishedNews(6),
    getSettings(),
    db.select().from(s.galleryItems).where(eq(s.galleryItems.published, true)).orderBy(desc(s.galleryItems.createdAt)).limit(6),
  ]);
  const finder = toFinder(catalogue);
  const aiCat = catalogue.find((c) => c.isAI);
  const allCourses = catalogue.flatMap((c) => c.courses).map((c) => ({ id: c.id, name: c.name }));

  const hero: HeroAd[] = heroAds.map((a) => ({
    id: a.id, title: a.title, subtitle: a.subtitle, description: a.description, ctaText: a.ctaText, imageUrl: a.imageUrl,
    theme: a.theme, highlightCourses: a.highlightCourses,
    deadline: a.applicationDeadline ? fmtDate(a.applicationDeadline, { day: "numeric", month: "long" }) : null,
    intakeStart: a.intakeStart ? fmtDate(a.intakeStart) : null,
  }));

  const events = news.filter((n) => n.kind === "EVENT" && n.eventDate && n.eventDate > new Date());
  const stories = news.filter((n) => n.kind !== "EVENT").slice(0, 3);

  return (
    <>
      {/* A — Hero: live campaigns + the intake register */}
      <section className="bg-navy">
        <div className="container-page grid gap-12 py-14 lg:grid-cols-[1.35fr_1fr] lg:py-20">
          <HeroCampaign ads={hero} />
          <aside aria-labelledby="intakes-h" className="self-start rounded-md border border-navy-600 bg-navy-800/60">
            <div className="flex items-baseline justify-between border-b border-navy-600 px-5 py-4">
              <h2 id="intakes-h" className="font-display text-xl text-white">Now enrolling</h2>
              <Link href="/courses" className="text-sm text-gold underline-offset-4 hover:underline">All courses</Link>
            </div>
            {intakes.length === 0 ? (
              <p className="px-5 py-6 text-sm text-mist">New intake dates will be published here soon.</p>
            ) : (
              <ul>
                {intakes.map((it) => {
                  const d = it.deadline ? daysUntil(it.deadline) : null;
                  return (
                    <li key={it.id} className="border-b border-navy-600 last:border-0">
                      <Link href={`/courses/${it.courseSlug}`} className="grid grid-cols-[1fr_auto] gap-3 px-5 py-3.5 hover:bg-navy-700">
                        <span>
                          <span className="block font-medium text-white">{it.courseName}</span>
                          <span className="text-sm text-slate-light">Starts {fmtDate(it.startDate, { day: "numeric", month: "short" })}</span>
                        </span>
                        {d != null && (
                          <span className="text-right">
                            <span className="block font-display text-2xl leading-none text-gold">{d}</span>
                            <span className="text-[0.7rem] text-slate-light">{d === 1 ? "day left" : "days left"}</span>
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </aside>
        </div>
      </section>

      {/* AI department */}
      {aiCat && (
        <section className="border-b border-line">
          <div className="container-page grid gap-10 py-16 lg:grid-cols-[1fr_1.5fr]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-sm bg-gold-light px-2.5 py-1 text-sm font-semibold text-gold-ink"><Icon.Spark size={16} /> New department</span>
              <h2 className="mt-4 text-4xl font-semibold leading-tight">Artificial intelligence short courses</h2>
              <p className="mt-4 max-w-md text-lg text-navy-700">
                Seven practical courses that put AI tools to work on real jobs — coding, websites, design, video, automation and documents. Taught in our computer lab, with live online lessons and recordings on the eLearning portal.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/ai-courses" className="btn btn-primary">See the AI courses</Link>
                <Link href="/apply" className="btn btn-outline">Apply online</Link>
              </div>
            </div>
            <ul className="grid gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-2">
              {aiCat.courses.map((c) => (
                <li key={c.id} className="bg-white">
                  <Link href={`/courses/${c.slug}`} className="block h-full p-5 hover:bg-mist-2">
                    <span className="font-display text-lg font-semibold">{c.name}</span>
                    <span className="mt-1 block text-sm text-slate">{c.summary}</span>
                  </Link>
                </li>
              ))}
              {aiCat.courses.length % 2 === 1 && (
                <li className="hidden bg-navy p-5 text-mist sm:block">
                  <p className="font-display text-lg text-white">Not sure which to choose?</p>
                  <p className="mt-1 text-sm">Start with AI for Document Creation if you are new to computers, or AI for Programming if you want to build software.</p>
                </li>
              )}
            </ul>
          </div>
        </section>
      )}

      {/* C — Course finder */}
      <section className="bg-mist-2">
        <div className="container-page py-16">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-4xl font-semibold">Find your course</h2>
              <p className="mt-3 max-w-xl text-navy-700">Short courses from 2 weeks to 6 months across six departments. Each course page lists its own duration, requirements and next intake.</p>
            </div>
            <Link href="/courses" className="btn btn-outline">Full catalogue</Link>
          </div>
          {courseAds.map((ad) => (
            <Link key={ad.id} href={`/go/${ad.id}`} className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-md border-l-4 border-gold bg-white px-5 py-4 hover:bg-mist">
              <span><strong className="font-display text-lg">{ad.title}</strong>{ad.subtitle && <span className="ml-2 text-slate">{ad.subtitle}</span>}</span>
              <span className="font-semibold underline underline-offset-4">{ad.ctaText}</span>
            </Link>
          ))}
          <CourseFinder courses={finder} categories={catalogue.map((c) => ({ slug: c.slug, name: c.name }))} compact />
        </div>
      </section>

      {/* D — Why GUVTC */}
      <section>
        <div className="container-page py-16">
          <h2 className="text-4xl font-semibold">Why study at GUVTC</h2>
          <div className="mt-10 grid gap-x-10 gap-y-8 md:grid-cols-2 lg:grid-cols-4">
            {[
              { i: Icon.Wrench, t: "Learn by doing", b: "Most of your time is spent in workshops, kitchens, salons and labs — making real things, not just reading about them." },
              { i: Icon.Users, t: "Instructors from the trade", b: "Small practical groups led by instructors who work in, and know, the trades they teach." },
              { i: Icon.Book, t: "A portfolio you can show", b: "Finish with garments, cakes, websites and projects you can show employers and customers." },
              { i: Icon.Shield, t: "A government centre", b: "GUVTC is a government vocational training institution serving Gweru and the Midlands." },
            ].map(({ i: I, t, b }) => (
              <div key={t}>
                <I size={28} className="text-gold-ink" />
                <h3 className="mt-4 text-xl font-semibold">{t}</h3>
                <p className="mt-2 text-navy-700">{b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Departments strip */}
      <section className="border-y border-line bg-white">
        <div className="container-page grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {catalogue.map((c) => {
            const I = CATEGORY_ICON[c.slug] ?? Icon.Book;
            return (
              <Link key={c.id} href={`/courses?category=${c.slug}`} className="flex flex-col gap-3 border-line p-5 hover:bg-mist-2 [&:not(:last-child)]:border-r">
                <I size={26} className={c.isAI ? "text-gold-ink" : "text-navy"} />
                <span className="font-medium leading-snug">{c.name}</span>
                <span className="text-sm text-slate">{c.courses.length} courses</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* E — Intakes, news, events */}
      <section className="bg-mist-2">
        <div className="container-page grid gap-12 py-16 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 className="text-3xl font-semibold">Dates for your diary</h2>
            <ul className="mt-6 space-y-4">
              {events.map((e) => (
                <li key={e.id} className="flex gap-4">
                  <span className="grid w-16 shrink-0 place-items-center rounded-sm bg-navy py-2 text-center text-white">
                    <span className="text-xs uppercase text-gold">{fmtDate(e.eventDate, { month: "short" })}</span>
                    <span className="font-display text-2xl leading-none">{fmtDate(e.eventDate, { day: "numeric" })}</span>
                  </span>
                  <span>
                    <Link href={`/news/${e.slug}`} className="font-semibold hover:underline">{e.title}</Link>
                    <span className="block text-sm text-slate">{e.location}{e.registrable && " · Registration open"}</span>
                  </span>
                </li>
              ))}
              {intakes.slice(0, 3).map((it) => it.deadline && (
                <li key={`d-${it.id}`} className="flex gap-4">
                  <span className="grid w-16 shrink-0 place-items-center rounded-sm border border-navy py-2 text-center">
                    <span className="text-xs uppercase text-slate">{fmtDate(it.deadline, { month: "short" })}</span>
                    <span className="font-display text-2xl leading-none">{fmtDate(it.deadline, { day: "numeric" })}</span>
                  </span>
                  <span>
                    <span className="font-semibold">Application deadline: {it.courseName}</span>
                    <span className="block text-sm text-slate">{it.name}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <h2 className="text-3xl font-semibold">News and notices</h2>
              <Link href="/news" className="text-sm font-semibold underline underline-offset-4">All news</Link>
            </div>
            <ul className="mt-6 divide-y divide-line border-y border-line">
              {stories.map((n) => (
                <li key={n.id} className="py-5">
                  <p className="text-sm text-slate">{n.kind === "NOTICE" ? "Notice" : n.kind === "OPPORTUNITY" ? "Opportunity" : "News"} · {fmtDate(n.publishedAt)}</p>
                  <Link href={`/news/${n.slug}`} className="mt-1 block font-display text-xl font-semibold hover:underline">{n.title}</Link>
                  <p className="mt-1 text-navy-700">{n.excerpt}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* F — Student work */}
      {gallery.length > 0 && (
        <section>
          <div className="container-page py-16">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-4xl font-semibold">Made at GUVTC</h2>
                <p className="mt-3 max-w-xl text-navy-700">Garments, cakes, websites and workshop projects by our students, shared with their permission.</p>
              </div>
              <Link href="/student-life" className="btn btn-outline">Student life</Link>
            </div>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {gallery.map((g) => (
                <li key={g.id} className="overflow-hidden rounded-md border border-line">
                  {g.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={g.imageUrl} alt={g.title} className="aspect-[4/3] w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="grid aspect-[4/3] place-items-center bg-mist text-slate" role="img" aria-label={`${g.title} — photograph to be added`}>
                      <span className="text-center text-sm">Photograph to be added</span>
                    </div>
                  )}
                  <div className="p-4">
                    <p className="font-semibold">{g.title}</p>
                    <p className="text-sm text-slate">{g.caption}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* G — Contact */}
      <section className="bg-navy text-white" id="enquire">
        <div className="container-page grid gap-12 py-16 lg:grid-cols-2">
          <div>
            <h2 className="text-4xl font-semibold">Questions before you apply?</h2>
            <p className="mt-4 max-w-md text-mist">Ask Admissions about a course, fees or intake dates. We reply by email or phone.</p>
            <ul className="mt-8 space-y-4">
              <li className="flex gap-3"><Icon.Phone className="text-gold" /><a href={telHref(settings.contact_phone)} className="hover:underline">{settings.contact_phone}</a></li>
              <li className="flex gap-3"><Icon.Mail className="text-gold" /><a href={`mailto:${settings.contact_email}`} className="hover:underline">{settings.contact_email}</a></li>
              <li className="flex gap-3"><Icon.Pin className="text-gold" />{settings.address}</li>
              {settings.whatsapp_number && (
                <li className="flex gap-3"><Icon.Whatsapp className="text-gold" />
                  <a href={`https://wa.me/${settings.whatsapp_number.replace(/\D/g, "")}?text=${encodeURIComponent("Hello GUVTC, I have a question about your courses.")}`} className="hover:underline" target="_blank" rel="noopener">Chat on WhatsApp</a>
                </li>
              )}
            </ul>
            <iframe title="Map showing GUVTC location, near Gafa Grounds on Zimuto Road" className="mt-8 aspect-[16/9] w-full rounded-md border-0 grayscale-[30%]" loading="lazy"
              src={`https://www.google.com/maps?q=${encodeURIComponent(settings.map_query)}&output=embed`} />
          </div>
          <div className="rounded-md bg-white p-6 text-navy md:p-8">
            <h3 className="font-display text-2xl font-semibold">Send an enquiry</h3>
            <div className="mt-5"><EnquiryForm courses={allCourses} source="homepage" /></div>
          </div>
        </div>
      </section>
    </>
  );
}
