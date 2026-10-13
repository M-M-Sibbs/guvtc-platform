import type { MetadataRoute } from "next";
import { eq, ne } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { appUrl } from "@/lib/app-url";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = appUrl();
  const [courses, news] = await Promise.all([
    db.select({ slug: s.courses.slug, updatedAt: s.courses.updatedAt }).from(s.courses).where(ne(s.courses.status, "DRAFT")),
    db.select({ slug: s.newsPosts.slug, publishedAt: s.newsPosts.publishedAt }).from(s.newsPosts).where(eq(s.newsPosts.published, true)),
  ]);
  const staticPages = ["", "/about", "/courses", "/ai-courses", "/admissions", "/apply", "/news", "/student-life", "/contact"];
  return [
    ...staticPages.map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.8 })),
    ...courses.map((c) => ({ url: `${base}/courses/${c.slug}`, lastModified: c.updatedAt, priority: 0.7 })),
    ...news.map((n) => ({ url: `${base}/news/${n.slug}`, lastModified: n.publishedAt ?? undefined, priority: 0.5 })),
  ];
}
