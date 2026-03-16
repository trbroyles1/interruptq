/**
 * Bridges Vercel/Supabase environment variables to the ones this app expects.
 *
 * Imported by next.config.ts which runs outside the normal module resolver,
 * so this file must NOT use @/ path aliases or import from the DB layer.
 */

const VERCEL_ENV_KEY = "VERCEL";
const VERCEL_ENV_VALUE = "1";
const DB_DRIVER_KEY = "DB_DRIVER";
const DB_DRIVER_POSTGRES = "postgres";
const DATABASE_URL_KEY = "DATABASE_URL";
const POSTGRES_URL_KEY = "POSTGRES_URL";
const POSTGRES_URL_NON_POOLING_KEY = "POSTGRES_URL_NON_POOLING";
const MIGRATION_URL_KEY = "MIGRATION_DATABASE_URL";

export function applyVercelEnv(): boolean {
  if (process.env[VERCEL_ENV_KEY] !== VERCEL_ENV_VALUE) {
    return false;
  }

  process.env[DB_DRIVER_KEY] = DB_DRIVER_POSTGRES;

  if (!process.env[DATABASE_URL_KEY]) {
    if (process.env[POSTGRES_URL_KEY]) {
      process.env[DATABASE_URL_KEY] = process.env[POSTGRES_URL_KEY];
    } else {
      console.warn(
        `[Vercel Env] Neither ${DATABASE_URL_KEY} nor ${POSTGRES_URL_KEY} is set.`,
      );
    }
  }

  if (!process.env[MIGRATION_URL_KEY]) {
    if (process.env[POSTGRES_URL_NON_POOLING_KEY]) {
      process.env[MIGRATION_URL_KEY] = process.env[POSTGRES_URL_NON_POOLING_KEY];
    }
  }

  return true;
}
