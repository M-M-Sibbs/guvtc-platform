import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedNews } from "@/lib/queries";
import { PageHeader } from "@/components/ui/ui";
import { fmtDate, cn } from "@/lib/utils";

export const metadata: Metadata = { title: "News & events", description: "News, events, open days, notices and opportunities from GUVTC.", alternates: { canonical: "/news" } };

const KINDS = [
  { v: "", l: "Everything" }, { v: "NEWS", l: "News" }, { v: "EVENT", l: "Events & open days" },
  { v: "NOTICE", l: "Notices" }, { v: "OPPORTUNITY", l: "Careers & opportunities" },
] as const;
const LABEL: Record<string, string> = { NEWS: "News", EVENT: "Event", NOTICE: "Notice", OPPORTUNITY: "Opportunity" };

export default async function NewsPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { kind } = await searchParams;
  const k = KINDS.find((x) => x.v === kind)?.v || undefined;
  const items = await getPublishedNews(50, k as "NEWS" | undefined);
  return (
    <>
      <PageHeader title="News & events" lead="Intake announcements, open days, workshops, exhibitions, notices and verified opportunities for students." />
      <div className="container-page py-12">
        <nav aria-label="Filter news" className="flex flex-wrap gap-2">
          {KINDS.map((x) => (
            <Link key={x.v} href={x.v ? `/news?kind=${x.v}` : "/news"} aria-current={(k ?? "") === x.v ? "page" : undefined}
              className={cn("rounded-sm border px-3 py-1.5 text-sm", (k ?? "") === x.v ? "border-navy bg-navy text-white" : "border-line hover:border-navy")}>{x.l}</Link>
          ))}
        </nav>
        <ul className="mt-8 divide-y divide-line border-y border-line">
          {items.map((n) => (
            <li key={n.id} className="grid gap-2 py-6 md:grid-cols-[160px_1fr]">
              <p className="text-sm text-slate">{LABEL[n.kind]}<br />{n.kind === "EVENT" && n.eventDate ? fmtDate(n.eventDate, { weekday: "short", day: "numeric", month: "short" }) : fmtDate(n.publishedAt)}</p>
              <div>
                <Link href={`/news/${n.slug}`} className="font-display text-2xl font-semibold hover:underline">{n.title}</Link>
                <p className="mt-1 max-w-2xl text-navy-700">{n.excerpt}</p>
              </div>
            </li>
          ))}
          {items.length === 0 && <li className="py-10 text-center text-slate">Nothing published in this category yet.</li>}
        </ul>
      </div>
    </>
  );
}
