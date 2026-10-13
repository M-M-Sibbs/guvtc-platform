import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { PageHeader } from "@/components/ui/ui";
import { EventRegistration } from "@/components/public/event-registration";
import { fmtDate, fmtDateTime } from "@/lib/utils";

type Props = { params: Promise<{ slug: string }> };
const get = (slug: string) => db.query.newsPosts.findFirst({ where: and(eq(s.newsPosts.slug, slug), eq(s.newsPosts.published, true)) });

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const n = await get((await params).slug);
  return n ? { title: n.title, description: n.excerpt, alternates: { canonical: `/news/${n.slug}` } } : {};
}

export default async function NewsArticle({ params }: Props) {
  const n = await get((await params).slug);
  if (!n) notFound();
  const upcoming = n.kind === "EVENT" && n.eventDate && n.eventDate > new Date();
  return (
    <>
      <PageHeader title={n.title} lead={n.excerpt} crumbs={[{ href: "/", label: "Home" }, { href: "/news", label: "News & events" }]} />
      <div className="container-page grid gap-12 py-12 lg:grid-cols-[1fr_360px]">
        <article>
          <p className="text-sm text-slate">Published {fmtDate(n.publishedAt)}</p>
          {n.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={n.imageUrl} alt="" className="mt-6 w-full rounded-md" />
          )}
          <div className="prose-guvtc mt-6 text-lg">{n.body.split(/\n{2,}/).map((para, i) => <p key={i}>{para}</p>)}</div>
        </article>
        {n.kind === "EVENT" && (
          <aside className="panel h-fit p-6">
            <h2 className="font-display text-xl font-semibold">Event details</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div><dt className="text-slate">When</dt><dd className="font-medium">{fmtDateTime(n.eventDate)}</dd></div>
              <div><dt className="text-slate">Where</dt><dd className="font-medium">{n.location ?? "GUVTC"}</dd></div>
            </dl>
            {upcoming && n.registrable && <div className="mt-6 border-t border-line pt-6"><EventRegistration newsId={n.id} /></div>}
          </aside>
        )}
      </div>
    </>
  );
}
