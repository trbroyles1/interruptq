/**
 * Runs database migrations as part of the Vercel build step.
 *
 * Invoked via `tsx` in the `build:vercel` npm script, after `next build`.
 * Uses the non-pooling Supabase connection (POSTGRES_URL_NON_POOLING) so
 * DDL statements aren't blocked by PgBouncer.
 *
 * This replaces running migrations at serverless cold-start time, which was
 * unreliable due to intermittent TCP connection timeouts from Lambda to
 * Supabase's direct Postgres endpoint.
 */

import { applyVercelEnv } from "./env";

const LOG_PREFIX = "[Vercel Build Migrate]";

applyVercelEnv();

const { runMigrations } = await import("@/db/migrate");

console.log(`${LOG_PREFIX} Running database migrations…`);
await runMigrations();
console.log(`${LOG_PREFIX} Migrations complete.`);

process.exit(0);
