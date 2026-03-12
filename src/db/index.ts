import { getDbDriver, getDbUrl } from "./config";

export const dbDriver = getDbDriver();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _db: any;

if (dbDriver === "postgres") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const postgres = require("postgres");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { drizzle } = require("drizzle-orm/postgres-js");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const schema = require("./schema.pg");

  const client = postgres(getDbUrl());
  _db = drizzle(client, { schema });
} else {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Database = require("better-sqlite3");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { drizzle } = require("drizzle-orm/better-sqlite3");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const schema = require("./schema");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require("node:path");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require("node:fs");

  const dbPath = getDbUrl();
  const resolvedPath = path.resolve(dbPath);

  fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });

  const sqlite = new Database(resolvedPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  _db = drizzle(sqlite, { schema });
}

export const db = _db;
