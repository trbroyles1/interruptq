#!/usr/bin/env npx tsx
/**
 * One-shot migration script: copy all data from local SQLite to Supabase Postgres.
 *
 * Usage:
 *   DATABASE_URL=postgresql://... npx tsx scripts/migrate-sqlite-to-pg.ts
 *
 * Optional:
 *   SQLITE_PATH=./data/interruptq.db  (defaults to ./data/interruptq.db)
 *
 * The Postgres database must already have the schema applied (run migrations first):
 *   DB_DRIVER=postgres DATABASE_URL=postgresql://... npm run dev
 *   (hit any endpoint once to trigger ensureDb, then kill the server)
 */

import Database from "better-sqlite3";
import postgres from "postgres";
import path from "path";
import fs from "fs";

const sqlitePath = path.resolve(process.env.SQLITE_PATH || "./data/interruptq.db");
const pgUrl: string = process.env.DATABASE_URL ?? "";

if (!pgUrl) {
  console.error("ERROR: DATABASE_URL is required (Postgres connection string)");
  process.exit(1);
}

if (!fs.existsSync(sqlitePath)) {
  console.error(`ERROR: SQLite database not found at ${sqlitePath}`);
  process.exit(1);
}

const sqlite = new Database(sqlitePath, { readonly: true });
sqlite.pragma("foreign_keys = OFF");

const pg = postgres(pgUrl);

// Tables in FK-safe insertion order:
// 1. identities (no FKs)
// 2. sprints, share_links, on_call_changes, known_tags, preferences (FK → identities only)
// 3. activities, sprint_goal_snapshots, priority_snapshots (FK → identities + sprints)
const TABLES_IN_ORDER = [
  "identities",
  "sprints",
  "share_links",
  "on_call_changes",
  "known_tags",
  "preferences",
  "activities",
  "sprint_goal_snapshots",
  "priority_snapshots",
];

// Columns that are boolean in PG but integer (0/1) in SQLite
const BOOLEAN_COLUMNS: Record<string, string[]> = {
  activities: ["on_call_at_time"],
  on_call_changes: ["status"],
};

async function main() {
  console.log(`Source:  ${sqlitePath}`);
  console.log(`Target:  ${pgUrl.replace(/\/\/.*@/, "//***@")}\n`);

  // Verify PG has the schema by checking for the identities table
  const tableCheck = await pg`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables WHERE table_name = 'identities'
    ) as exists
  `;
  if (!tableCheck[0].exists) {
    console.error("ERROR: Postgres schema not found. Run migrations first:");
    console.error("  DB_DRIVER=postgres DATABASE_URL=... npm run db:push:pg");
    await pg.end();
    process.exit(1);
  }

  // Check if PG already has data
  const pgCount = await pg`SELECT count(*) as n FROM identities`;
  if (Number(pgCount[0].n) > 0) {
    console.error("WARNING: Postgres identities table already has data.");
    console.error("This script is meant for a fresh Postgres database.");
    console.error("Aborting to avoid duplicates. Clear the PG tables first if you want to re-run.\n");
    await pg.end();
    process.exit(1);
  }

  let totalRows = 0;

  for (const table of TABLES_IN_ORDER) {
    const rows = sqlite.prepare(`SELECT * FROM ${table}`).all() as Record<string, unknown>[];

    if (rows.length === 0) {
      console.log(`  ${table}: 0 rows (skipped)`);
      continue;
    }

    // Convert SQLite integer booleans to actual booleans for PG
    const boolCols = BOOLEAN_COLUMNS[table];
    if (boolCols) {
      for (const row of rows) {
        for (const col of boolCols) {
          if (col in row) {
            row[col] = row[col] === 1 || row[col] === true;
          }
        }
      }
    }

    const columns = Object.keys(rows[0]);

    // Batch insert in chunks of 500
    const BATCH_SIZE = 500;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      await pg`INSERT INTO ${pg(table)} ${pg(batch, ...columns)}`;
    }

    console.log(`  ${table}: ${rows.length} rows`);
    totalRows += rows.length;

    // Reset the serial sequence to max(id) + 1 so future inserts don't collide
    if (columns.includes("id")) {
      await pg`SELECT setval(pg_get_serial_sequence(${table}, 'id'), (SELECT COALESCE(MAX(id), 0) FROM ${pg(table)}))`;
    }
  }

  console.log(`\nDone! ${totalRows} total rows migrated.`);

  sqlite.close();
  await pg.end();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
