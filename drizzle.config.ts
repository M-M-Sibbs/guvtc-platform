import { defineConfig } from "drizzle-kit";

// Load .env when running locally (Vercel provides variables directly).
try { process.loadEnvFile(); } catch {}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  // Neon (via Vercel) provides a direct connection for migrations as DATABASE_URL_UNPOOLED.
  dbCredentials: { url: (process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL)! },
});
