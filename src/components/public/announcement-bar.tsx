import Link from "next/link";
import { getLiveAds } from "@/lib/queries";

export async function AnnouncementBar() {
  const [ad] = await getLiveAds("ANNOUNCEMENT_BAR", 1);
  if (!ad) return null;
  return (
    <div className="bg-gold text-navy">
      <div className="container-page flex flex-wrap items-center justify-center gap-x-3 gap-y-1 py-2 text-sm text-center">
        <strong className="font-semibold">{ad.title}</strong>
        {ad.subtitle && <span className="hidden md:inline">{ad.subtitle}</span>}
        <Link href={`/go/${ad.id}`} className="font-semibold underline underline-offset-4">{ad.ctaText}</Link>
      </div>
    </div>
  );
}
