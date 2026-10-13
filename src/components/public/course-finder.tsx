"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Icon, CATEGORY_ICON } from "@/components/ui/icons";
import { DELIVERY_LABELS, cn } from "@/lib/utils";

export type FinderCourse = {
  slug: string; name: string; summary: string; categorySlug: string; categoryName: string; isAI: boolean;
  modes: string[]; durationText: string | null; durationWeeks: number | null; status: string; nextIntake: string | null; deadline: string | null;
};
type Cat = { slug: string; name: string };

const DURATIONS = [
  { v: "", label: "Any length" },
  { v: "short", label: "Up to 4 weeks" },
  { v: "mid", label: "1 – 3 months" },
  { v: "long", label: "3 – 6 months" },
];

export function CourseFinder({ courses, categories, initialCategory = "", compact = false }: { courses: FinderCourse[]; categories: Cat[]; initialCategory?: string; compact?: boolean }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState(initialCategory);
  const [mode, setMode] = useState("");
  const [dur, setDur] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return courses.filter((c) =>
      (!term || `${c.name} ${c.summary} ${c.categoryName}`.toLowerCase().includes(term)) &&
      (!cat || c.categorySlug === cat) &&
      (!mode || c.modes.includes(mode)) &&
      (!dur || (c.durationWeeks != null && (dur === "short" ? c.durationWeeks <= 4 : dur === "mid" ? c.durationWeeks > 4 && c.durationWeeks <= 13 : c.durationWeeks > 13))),
    );
  }, [courses, q, cat, mode, dur]);

  return (
    <div>
      <div className="grid gap-3 md:grid-cols-[1.6fr_1fr_1fr]">
        <label className="relative block">
          <span className="sr-only">Search courses</span>
          <Icon.Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate" />
          <input className="input pl-10" placeholder="Search: cakes, braiding, websites…" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <label>
          <span className="sr-only">Learning mode</span>
          <select className="input" value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="">Any learning mode</option>
            {Object.entries(DELIVERY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        <label>
          <span className="sr-only">Duration</span>
          <select className="input" value={dur} onChange={(e) => setDur(e.target.value)}>
            {DURATIONS.map((d) => <option key={d.v} value={d.v}>{d.label}</option>)}
          </select>
        </label>
      </div>
      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filter by department">
        {[{ slug: "", name: "All departments" }, ...categories].map((c) => (
          <button key={c.slug} onClick={() => setCat(c.slug)} aria-pressed={cat === c.slug}
            className={cn("rounded-sm border px-3 py-1.5 text-sm", cat === c.slug ? "border-navy bg-navy text-white" : "border-line hover:border-navy")}>
            {c.name}
          </button>
        ))}
      </div>
      <p className="mt-5 text-sm text-slate" aria-live="polite">{filtered.length} {filtered.length === 1 ? "course" : "courses"}</p>

      <ul className="mt-2 divide-y divide-line border-y border-line">
        {filtered.slice(0, compact ? 8 : undefined).map((c) => {
          const I = CATEGORY_ICON[c.categorySlug] ?? Icon.Book;
          return (
            <li key={c.slug} className="grid gap-3 py-5 md:grid-cols-[auto_1fr_auto] md:items-center md:gap-6">
              <span className={cn("hidden h-11 w-11 place-items-center rounded-sm md:grid", c.isAI ? "bg-navy text-gold" : "bg-mist text-navy")}><I /></span>
              <div>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <Link href={`/courses/${c.slug}`} className="font-display text-xl font-semibold hover:underline underline-offset-4">{c.name}</Link>
                  <span className="text-sm text-slate">{c.categoryName}</span>
                </div>
                <p className="mt-1 max-w-2xl text-[0.95rem] text-navy-700">{c.summary}</p>
                <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate">
                  <span>{c.durationText ?? "Duration confirmed on enquiry"}</span>
                  <span>{c.modes.map((m) => DELIVERY_LABELS[m] ?? m).join(", ")}</span>
                  {c.nextIntake && <span>Next intake {c.nextIntake}</span>}
                </p>
              </div>
              <div className="flex gap-2 md:flex-col md:items-stretch">
                {c.status === "OPEN" ? (
                  <Link href={`/apply?course=${c.slug}`} className="btn btn-primary btn-sm">Apply</Link>
                ) : (
                  <span className="btn btn-sm border-line text-slate" aria-disabled>Enrolment closed</span>
                )}
                <Link href={`/courses/${c.slug}`} className="btn btn-outline btn-sm">Details</Link>
              </div>
            </li>
          );
        })}
      </ul>
      {filtered.length === 0 && (
        <p className="py-10 text-center text-slate">No courses match. Clear a filter or <Link href="/contact" className="underline">ask Admissions</Link>.</p>
      )}
    </div>
  );
}
