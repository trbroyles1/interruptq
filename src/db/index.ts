import path from "node:path";
import fs from "node:fs";
import { getDbDriver, getDbUrl } from "./config";

export const dbDriver = getDbDriver();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _db: any;

if (dbDriver === "postgres") {
  const postgres = (await import("postgres")).default;
  const { drizzle } = await import("drizzle-orm/postgres-js");
  const schema = await import("./schema.pg");

  const client = postgres(getDbUrl());
  _db = drizzle(client, { schema });
} else {
  const Database = (await import("better-sqlite3")).default;
  const { drizzle } = await import("drizzle-orm/better-sqlite3");
  const schema = await import("./schema");

  const dbPath = getDbUrl();
  const resolvedPath = path.resolve(dbPath);

  fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });

  const sqlite = new Database(resolvedPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  _db = drizzle(sqlite, { schema });
}

export const db = _db;
