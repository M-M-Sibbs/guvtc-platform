// Placeholder wordmark. Replace with the official GUVTC logo / government crest once supplied and approved
// (drop the file in public/branding/ and swap this component).
export function Wordmark({ light = false, compact = false }: { light?: boolean; compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-3">
      <span className={`grid h-10 w-10 place-items-center rounded-sm border-2 ${light ? "border-gold text-gold" : "border-navy text-navy"} font-display text-sm font-bold`} aria-hidden>
        GU
      </span>
      <span className="leading-tight">
        <span className={`block font-display font-semibold ${compact ? "text-base" : "text-lg"} ${light ? "text-white" : "text-navy"}`}>Gweru Urban</span>
        <span className={`block text-[0.7rem] tracking-wide ${light ? "text-gold-light" : "text-slate"}`}>Vocational Training Centre</span>
      </span>
    </span>
  );
}
