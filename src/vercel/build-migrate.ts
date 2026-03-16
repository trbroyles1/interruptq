/**
 * Runs database migrations as part of the Vercel build step.
 *
 * Invoked via `tsx` in the `build:vercel` npm script, after `next build`.
 * This replaces running migrations at serverless cold-start time, which was
 * unreliable due to intermittent TCP connection timeouts from Lambda to
 * Supabase's Postgres endpoint.
 */

import { applyVercelEnv } from "./env";

const LOG_PREFIX = "[Vercel Build Migrate]";

applyVercelEnv();

const { runMigrations } = await import("@/db/migrate");

console.log(`${LOG_PREFIX} Running database migrations…`);
await runMigrations();
console.log(`${LOG_PREFIX} Migrations complete.`);

process.exit(0);
