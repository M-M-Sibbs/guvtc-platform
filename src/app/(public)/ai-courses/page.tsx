import type { Metadata } from "next";
import Link from "next/link";
import { getCatalogue, getLiveAds } from "@/lib/queries";
import { Icon } from "@/components/ui/icons";
import { DELIVERY_LABELS, fmtDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "AI short courses",
  description: "New artificial intelligence short courses in Gweru: AI for programming, software and web development, automation, video, graphic design and documents.",
  alternates: { canonical: "/ai-courses" },
};

const WHO: Record<string, string> = {
  "ai-for-programming": "School leavers and career changers who want to code",
  "ai-for-software-development": "Learners who can code a little and want to build complete apps",
  "ai-for-web-development": "Anyone who wants to build websites for themselves or clients",
  "ai-for-automation": "Office workers and small business owners",
  "ai-for-video-content-creation": "Content creators, marketers and small businesses",
  "ai-for-graphic-design": "Aspiring designers and anyone who makes adverts",
  "ai-for-document-creation": "Administrators, students and job seekers",
};

export default async function AICoursesPage() {
  const [catalogue, campaign] = await Promise.all([getCatalogue(), getLiveAds("CAMPAIGN_PAGE", 1)]);
  const ai = catalogue.find((c) => c.isAI);
  const courses = ai?.courses ?? [];
  return (
    <>
      <section className="bg-navy text-white">
        <div className="container-page grid gap-10 py-16 lg:grid-cols-[1.3fr_1fr] lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 text-gold"><Icon.Spark /> Department of Artificial Intelligence</span>
            <h1 className="mt-4 text-5xl font-semibold leading-[1.05] md:text-6xl">Turn your ideas into digital skills.</h1>
            <p className="mt-6 max-w-xl text-lg text-mist">
              Short, practical courses that teach you to use AI tools on real work — and to check what they produce. Lab sessions on campus, live online classes and recorded lessons you can replay on your phone.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/apply" className="btn btn-gold">Apply online today</Link>
              <a href="#courses" className="btn btn-ghost-light">Compare the courses</a>
            </div>
          </div>
          <div className="self-end rounded-md border border-navy-600 p-6">
            <h2 className="font-display text-xl">How you will learn</h2>
            <ul className="mt-4 space-y-4 text-mist">
              <li className="flex gap-3"><Icon.Monitor className="shrink-0 text-gold" /><span><strong className="text-white">Computer lab practicals.</strong> Hands-on sessions with instructor support.</span></li>
              <li className="flex gap-3"><Icon.Video className="shrink-0 text-gold" /><span><strong className="text-white">Live online classes.</strong> Join from the eLearning portal.</span></li>
              <li className="flex gap-3"><Icon.Play className="shrink-0 text-gold" /><span><strong className="text-white">Recorded lessons and notes.</strong> Catch up any time, download notes to study offline.</span></li>
              <li className="flex gap-3"><Icon.Shield className="shrink-0 text-gold" /><span><strong className="text-white">Responsible AI.</strong> Checking accuracy and protecting personal data are part of every course.</span></li>
            </ul>
          </div>
        </div>
      </section>
      {campaign[0] && (
        <div className="bg-gold-light">
          <div className="container-page flex flex-wrap items-center justify-between gap-3 py-4">
            <span><strong>{campaign[0].title}</strong> {campaign[0].subtitle}</span>
            <Link href={`/go/${campaign[0].id}`} className="font-semibold underline">{campaign[0].ctaText}</Link>
          </div>
        </div>
      )}
      <section id="courses" className="container-page py-16">
        <h2 className="text-4xl font-semibold">Seven courses</h2>
        <div className="relative mt-8 overflow-x-auto">
          <table className="table-std min-w-[760px]">
            <thead><tr><th>Course</th><th>Who it suits</th><th>Learning mode</th><th>Next intake</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {courses.map((c) => (
                <tr key={c.id}>
                  <td className="max-w-xs"><Link href={`/courses/${c.slug}`} className="font-display text-lg font-semibold hover:underline">{c.name}</Link><p className="text-slate">{c.summary}</p></td>
                  <td>{WHO[c.slug] ?? "—"}</td>
                  <td>{c.deliveryModes.map((m) => DELIVERY_LABELS[m]).join(", ")}</td>
                  <td>{c.intakes[0] ? fmtDate(c.intakes[0].startDate) : "To be announced"}</td>
                  <td className="whitespace-nowrap"><Link href={`/apply?course=${c.slug}`} className="btn btn-primary btn-sm">Apply</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-slate">Course descriptions are subject to the approved syllabus. Fees and durations are confirmed by Admissions.</p>
      </section>
    </>
  );
}
