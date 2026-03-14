/**
 * Bridges Vercel/Supabase environment variables to the ones this app expects.
 * Must remain free of DB imports so it can run before any module reads env vars.
 */

const VERCEL_ENV_KEY = "VERCEL";
const VERCEL_ENV_VALUE = "1";
const DB_DRIVER_KEY = "DB_DRIVER";
const DB_DRIVER_POSTGRES = "postgres";
const DATABASE_URL_KEY = "DATABASE_URL";
const POSTGRES_URL_KEY = "POSTGRES_URL";
const POSTGRES_URL_NON_POOLING_KEY = "POSTGRES_URL_NON_POOLING";
export const MIGRATION_URL_KEY = "MIGRATION_DATABASE_URL";

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
