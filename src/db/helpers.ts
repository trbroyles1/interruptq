import { dbDriver } from "./index";

/**
 * Execute a select query and return the first row.
 * Replaces `.get()` — works with both SQLite (sync) and Postgres (async).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function first<T = any>(builder: any): Promise<T | undefined> {
  if (dbDriver === "sqlite") {
    return builder.get() as T | undefined;
  }
  const rows = await builder;
  return rows[0] as T | undefined;
}

/**
 * Execute a select query and return all rows.
 * Replaces `.all()` — works with both SQLite (sync) and Postgres (async).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function all<T = any>(builder: any): Promise<T[]> {
  if (dbDriver === "sqlite") {
    return builder.all() as T[];
  }
  return (await builder) as T[];
}

/**
 * Execute an insert/update/delete query, discarding the result.
 * Replaces `.run()` — works with both SQLite (sync) and Postgres (async).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function run(builder: any): Promise<void> {
  if (dbDriver === "sqlite") {
    builder.run();
    return;
  }
  await builder;
}

/**
 * Execute an insert/update/delete with `.returning()` and return the first row.
 * Replaces `.returning().get()` — works with both SQLite (sync) and Postgres (async).
 *
 * For SQLite: call `.returning()` on the builder BEFORE passing to this function,
 *   then this calls `.get()` on it.
 * For Postgres: call `.returning()` on the builder BEFORE passing to this function,
 *   then this awaits it and returns the first row.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function returningFirst<T = any>(builder: any): Promise<T> {
  if (dbDriver === "sqlite") {
    return builder.get() as T;
  }
  const rows = await builder;
  return rows[0] as T;
}
