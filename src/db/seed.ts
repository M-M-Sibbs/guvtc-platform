/**
 * Seed script.
 *   npm run db:seed                 → catalogue + settings + demo staff, students, adverts, intakes, results
 *   npm run db:seed -- --production → catalogue + settings + one super administrator only
 *     (uses SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, SEED_ADMISSIONS_EMAIL)
 *
 * On Vercel you don't need this: open /setup on the live site instead.
 * Demo intakes, adverts, news and people are illustrative and must be replaced before launch.
 */
import { runSeed, DEMO_PASSWORD } from "./seed-core";

const production = process.argv.includes("--production");

runSeed({
  production,
  adminEmail: process.env.SEED_ADMIN_EMAIL || "admin@guvtc.example",
  password: production ? (process.env.SEED_ADMIN_PASSWORD || DEMO_PASSWORD) : DEMO_PASSWORD,
  admissionsEmail: process.env.SEED_ADMISSIONS_EMAIL,
  log: console.log,
}).then(() => {
  if (!production) {
    console.log("All demo accounts use the password:", DEMO_PASSWORD);
    console.log("  admin@guvtc.example · admissions@ · marketing@ · lecturer.ai@ · exams@ · finance@ · principal@ · registrar@");
    console.log("  student: tendai.student@guvtc.example");
  }
  process.exit(0);
}).catch((e) => { console.error(e); process.exit(1); });
