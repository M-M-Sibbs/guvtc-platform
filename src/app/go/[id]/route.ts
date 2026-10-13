import { NextResponse, type NextRequest } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db, schema as s } from "@/db";

// Advert click tracking. Counts the click, remembers the campaign for 30 days (first-party cookie,
// no personal data) so completed applications can be attributed, then redirects to the CTA.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [ad] = await db.update(s.advertisements)
    .set({ clicks: sql`${s.advertisements.clicks} + 1` })
    .where(eq(s.advertisements.id, id))
    .returning({ ctaUrl: s.advertisements.ctaUrl, id: s.advertisements.id });
  const target = ad && isSafe(ad.ctaUrl) ? ad.ctaUrl : "/";
  const res = NextResponse.redirect(new URL(target, req.url));
  if (ad) res.cookies.set("guvtc_ad", ad.id, { maxAge: 60 * 60 * 24 * 30, httpOnly: true, sameSite: "lax", path: "/" });
  return res;
}

function isSafe(url: string) {
  return (url.startsWith("/") && !url.startsWith("//")) || /^https?:\/\//.test(url);
}
