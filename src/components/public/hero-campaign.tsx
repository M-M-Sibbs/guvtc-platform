"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type HeroAd = {
  id: string; title: string; subtitle: string | null; description: string | null; ctaText: string;
  imageUrl: string | null; theme: string; highlightCourses: string[]; deadline: string | null; intakeStart: string | null;
};

const DEFAULT: HeroAd = {
  id: "", title: "Skills for today. Opportunities for tomorrow.",
  subtitle: "Practical skills. Professional training. A future you can build.",
  description: null, ctaText: "Apply online", imageUrl: null, theme: "navy", highlightCourses: [], deadline: null, intakeStart: null,
};

export function HeroCampaign({ ads }: { ads: HeroAd[] }) {
  const slides = ads.length ? ads : [DEFAULT];
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || slides.length < 2) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const t = setInterval(() => setI((n) => (n + 1) % slides.length), 8000);
    return () => clearInterval(t);
  }, [paused, slides.length]);

  const ad = slides[i];
  return (
    <div className="relative flex h-full flex-col" aria-roledescription="carousel" aria-label="Current campaigns"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)}>
      <div key={ad.id || "default"} className="ad-enter flex-1" aria-live={paused ? "polite" : "off"}>
        {ad.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ad.imageUrl} alt="" className="mb-6 aspect-[16/7] w-full rounded-md object-cover" />
        )}
        <p className="text-sm font-semibold text-gold">
          {ad.id ? (ad.deadline ? `Applications close ${ad.deadline}` : "Now enrolling") : "Gweru Urban Vocational Training Centre"}
        </p>
        <h1 className="mt-3 text-[2.6rem] leading-[1.05] font-semibold text-white sm:text-6xl lg:text-[4.2rem]">
          {ad.title}
        </h1>
        {ad.subtitle && <p className="mt-5 max-w-xl text-xl text-mist">{ad.subtitle}</p>}
        {ad.description && <p className="mt-3 max-w-xl text-mist/80">{ad.description}</p>}
        {ad.highlightCourses.length > 0 && (
          <ul className="mt-6 flex max-w-xl flex-wrap gap-2">
            {ad.highlightCourses.map((c) => (
              <li key={c} className="rounded-sm border border-navy-600 px-3 py-1 text-sm text-mist">{c}</li>
            ))}
          </ul>
        )}
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={ad.id ? `/go/${ad.id}` : "/apply"} className="btn btn-gold">{ad.ctaText}</Link>
          <Link href="/courses" className="btn btn-ghost-light">Explore courses</Link>
        </div>
      </div>
      {slides.length > 1 && (
        <div className="mt-10 flex items-center gap-4">
          <div className="flex gap-2">
            {slides.map((s, n) => (
              <button key={s.id} onClick={() => setI(n)} aria-label={`Show campaign ${n + 1}: ${s.title}`} aria-current={n === i}
                className={cn("h-1.5 rounded-full transition-all", n === i ? "w-10 bg-gold" : "w-5 bg-navy-600 hover:bg-slate")} />
            ))}
          </div>
          <button onClick={() => setPaused((p) => !p)} className="text-xs text-slate-light underline underline-offset-4">
            {paused ? "Play" : "Pause"}
          </button>
        </div>
      )}
    </div>
  );
}
