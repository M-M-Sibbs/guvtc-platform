// Runs database migrations during the Vercel build.
// If no database is connected yet (very first deploy), it skips instead of failing the build.
import { spawnSync } from "node:child_process";

if (!process.env.DATABASE_URL && !process.env.DATABASE_URL_UNPOOLED) {
  console.warn("⚠ No DATABASE_URL yet: skipping migrations. Connect a Neon database in Vercel → Storage, then redeploy.");
  process.exit(0);
}
const r = spawnSync("npx", ["drizzle-kit", "migrate"], { stdio: "inherit" });
process.exit(r.status ?? 1);
