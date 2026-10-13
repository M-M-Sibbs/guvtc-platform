import "server-only";
import { headers } from "next/headers";

// Simple fixed-window limiter for public forms. On multi-instance hosting, back this with Redis/Upstash.
const hits = new Map<string, { n: number; reset: number }>();

export async function clientIp() {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "local").trim();
}

export async function rateLimit(bucket: string, limit: number, windowSec: number) {
  const key = `${bucket}:${await clientIp()}`;
  const now = Date.now();
  const cur = hits.get(key);
  if (!cur || cur.reset < now) {
    hits.set(key, { n: 1, reset: now + windowSec * 1000 });
    return true;
  }
  cur.n++;
  return cur.n <= limit;
}
