import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { liveAdCondition } from "@/lib/queries";
import { fmtDate } from "@/lib/utils";

type Props = { params: Promise<{ slug: string }> };
const get = (slug: string) => db.query.advertisements.findFirst({ where: and(eq(s.advertisements.slug, slug), liveAdCondition()), with: { course: true } });

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const ad = await get((await params).slug);
  return ad ? { title: ad.title, description: ad.subtitle ?? undefined, openGraph: { images: ad.imageUrl ? [ad.imageUrl] : undefined } } : {};
}

// Shareable landing page for any live advert: /campaigns/<slug>
export default async function CampaignPage({ params }: Props) {
  const ad = await get((await params).slug);
  if (!ad) notFound();
  return (
    <section className="bg-navy text-white">
      <div className="container-page grid gap-10 py-16 lg:grid-cols-2 lg:py-24">
        <div>
          {ad.applicationDeadline && <p className="font-semibold text-gold">Applications close {fmtDate(ad.applicationDeadline, { day: "numeric", month: "long" })}</p>}
          <h1 className="mt-3 text-5xl font-semibold leading-tight md:text-6xl">{ad.title}</h1>
          {ad.subtitle && <p className="mt-5 text-xl text-mist">{ad.subtitle}</p>}
          {ad.description && <p className="mt-4 max-w-xl text-mist/85">{ad.description}</p>}
          {ad.highlightCourses.length > 0 && <ul className="mt-6 flex flex-wrap gap-2">{ad.highlightCourses.map((c) => <li key={c} className="rounded-sm border border-navy-600 px-3 py-1 text-sm">{c}</li>)}</ul>}
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={`/go/${ad.id}`} className="btn btn-gold">{ad.ctaText}</Link>
            {ad.course && <Link href={`/courses/${ad.course.slug}`} className="btn btn-ghost-light">About {ad.course.name}</Link>}
          </div>
          {ad.intakeStart && <p className="mt-6 text-sm text-slate-light">Intake starts {fmtDate(ad.intakeStart)}</p>}
        </div>
        {ad.videoUrl ? (
          <iframe className="aspect-video w-full rounded-md" src={ad.videoUrl} title={ad.title} allowFullScreen />
        ) : ad.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ad.imageUrl} alt="" className="w-full rounded-md object-cover" />
        ) : null}
      </div>
    </section>
  );
}
