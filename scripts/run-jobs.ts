// Same jobs as /api/jobs, for servers that prefer a system cron:  */10 * * * * cd /app && npm run jobs:run
import { retryFailed } from "../src/lib/email";

retryFailed().then((n) => { console.log(`Retried ${n} failed email(s)`); process.exit(0); });
