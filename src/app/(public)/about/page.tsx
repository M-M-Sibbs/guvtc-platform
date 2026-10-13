import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/ui";
import { getCatalogue } from "@/lib/queries";

export const metadata: Metadata = { title: "About GUVTC", description: "Gweru Urban Vocational Training Centre is a government vocational training institution teaching practical, employable skills.", alternates: { canonical: "/about" } };

export default async function AboutPage() {
  const cats = await getCatalogue();
  return (
    <>
      <PageHeader title="About GUVTC" lead="A government vocational training centre in Gweru, teaching practical skills people can use to find work or start a business." />
      <div className="container-page grid gap-12 py-14 lg:grid-cols-[1.4fr_1fr]">
        <div className="prose-guvtc text-lg">
          <p>Gweru Urban Vocational Training Centre (GUVTC) trains school leavers, job seekers and working adults in hands-on trades and services — from dressmaking, beauty and catering to motor mechanics, window frame manufacture and computers.</p>
          <p>Our short courses run from two weeks to six months. Most learning happens in our workshops, salon, training kitchen and computer lab, where students practise on real equipment under the guidance of experienced instructors.</p>
          <p>In 2026 the centre opened a Department of Artificial Intelligence, offering short courses that teach practical, responsible use of AI for programming, web and software development, automation, graphic design, video and document creation.</p>
          <p className="text-base text-slate">[Placeholder for the approved institutional history, mission statement and ministry affiliation — to be supplied by GUVTC.]</p>
        </div>
        <aside className="panel h-fit p-6">
          <h2 className="font-display text-xl font-semibold">Departments</h2>
          <ul className="mt-4 space-y-3">
            {cats.map((c) => (
              <li key={c.id}><Link href={`/courses?category=${c.slug}`} className="font-medium hover:underline">{c.name}</Link><p className="text-sm text-slate">{c.description}</p></li>
            ))}
          </ul>
        </aside>
      </div>
    </>
  );
}
