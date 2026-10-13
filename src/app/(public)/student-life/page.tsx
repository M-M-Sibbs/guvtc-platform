import type { Metadata } from "next";
import Link from "next/link";
import { eq, desc } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { PageHeader } from "@/components/ui/ui";
import { getPublishedNews } from "@/lib/queries";

export const metadata: Metadata = { title: "Student life", description: "Workshops, student projects, exhibitions and opportunities at GUVTC.", alternates: { canonical: "/student-life" } };

export default async function StudentLife() {
  const [gallery, opps] = await Promise.all([
    db.select().from(s.galleryItems).where(eq(s.galleryItems.published, true)).orderBy(desc(s.galleryItems.createdAt)),
    getPublishedNews(6, "OPPORTUNITY"),
  ]);
  return (
    <>
      <PageHeader title="Student life" lead="Workshops, projects, exhibitions — and the work our students produce." />
      <section className="container-page py-14">
        <h2 className="text-3xl font-semibold">Student work and facilities</h2>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {gallery.map((g) => (
            <li key={g.id} className="overflow-hidden rounded-md border border-line">
              {g.imageUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={g.imageUrl} alt={g.title} className="aspect-[4/3] w-full object-cover" loading="lazy" />
                : <div className="grid aspect-[4/3] place-items-center bg-mist text-sm text-slate">Photograph to be added</div>}
              <div className="p-4"><p className="font-semibold">{g.title}</p><p className="text-sm text-slate">{g.category} · {g.caption}</p></div>
            </li>
          ))}
        </ul>
      </section>
      <section className="bg-mist-2">
        <div className="container-page py-14">
          <h2 className="text-3xl font-semibold">Careers and opportunities</h2>
          <p className="mt-2 max-w-xl text-navy-700">Attachments, jobs and entrepreneurship workshops. Every opportunity is verified by the centre before it is published.</p>
          <ul className="mt-6 divide-y divide-line border-y border-line">
            {opps.map((o) => <li key={o.id} className="py-4"><Link href={`/news/${o.slug}`} className="font-display text-xl font-semibold hover:underline">{o.title}</Link><p className="text-navy-700">{o.excerpt}</p></li>)}
            {opps.length === 0 && <li className="py-6 text-slate">New opportunities will appear here.</li>}
          </ul>
        </div>
      </section>
    </>
  );
}
