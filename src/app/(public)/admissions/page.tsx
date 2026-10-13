import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/ui";
import { getUpcomingIntakes } from "@/lib/queries";
import { fmtDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Admissions", description: "How to apply to GUVTC online: choose a course, complete the form, upload documents and receive your reference by email.", alternates: { canonical: "/admissions" } };

const STEPS = [
  ["Choose a course and intake", "Browse the catalogue and pick the intake you want to join."],
  ["Complete the online form", "It takes about 10 minutes. Your progress is saved on this device, so you can stop and come back."],
  ["Upload your documents", "A copy of your ID and certificates (PDF or photo). Clear phone photos are fine."],
  ["Get your reference number", "We email you a confirmation with your reference. Admissions receives your application at the same time."],
  ["Admissions review", "An admissions officer checks your application. If anything is missing we will email you."],
  ["Decision and enrolment", "You receive an offer and enrolment instructions by email, then your eLearning account."],
];

export default async function AdmissionsPage() {
  const intakes = await getUpcomingIntakes(12);
  return (
    <>
      <PageHeader title="Admissions" lead="Apply online from your phone or computer. You will get a reference number by email straight away.">
        <div className="mt-8 flex flex-wrap gap-3"><Link href="/apply" className="btn btn-gold">Start your application</Link><Link href="/apply/track" className="btn btn-ghost-light">Track an application</Link></div>
      </PageHeader>
      <div className="container-page grid gap-14 py-14 lg:grid-cols-[1.3fr_1fr]">
        <section>
          <h2 className="text-3xl font-semibold">How applying works</h2>
          <ol className="mt-8 space-y-6">
            {STEPS.map(([t, b], i) => (
              <li key={t} className="grid grid-cols-[48px_1fr] gap-4">
                <span className="grid h-12 w-12 place-items-center rounded-full border-2 border-gold font-display text-xl font-semibold">{i + 1}</span>
                <div><h3 className="text-xl font-semibold">{t}</h3><p className="mt-1 text-navy-700">{b}</p></div>
              </li>
            ))}
          </ol>
          <h2 className="mt-14 text-3xl font-semibold">What to have ready</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-navy-700">
            <li>National ID or passport (a clear photo or scan)</li>
            <li>Your highest academic certificate or results slip, if you have one</li>
            <li>An email address you check — this is how we contact you</li>
            <li>An emergency contact's name and phone number</li>
          </ul>
          <p className="mt-4 text-sm text-slate">Admission decisions are made by the centre's admissions staff, not automatically.</p>
        </section>
        <aside>
          <div className="panel overflow-hidden">
            <h2 className="bg-navy px-5 py-4 font-display text-xl text-white">Application deadlines</h2>
            <ul className="divide-y divide-line">
              {intakes.map((i) => (
                <li key={i.id} className="flex justify-between gap-3 px-5 py-3 text-sm">
                  <Link href={`/courses/${i.courseSlug}`} className="font-medium hover:underline">{i.courseName}</Link>
                  <span className="whitespace-nowrap text-slate">{fmtDate(i.deadline)}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}
