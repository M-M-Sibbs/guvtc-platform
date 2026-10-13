import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/app-url";

export default function robots(): MetadataRoute.Robots {
  const base = appUrl();
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/staff", "/student", "/api", "/login", "/go/"] }], sitemap: `${base}/sitemap.xml` };
}
