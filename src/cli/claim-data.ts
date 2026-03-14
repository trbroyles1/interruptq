#!/usr/bin/env node

/**
 * CLI command to claim pre-existing (sentinel identity) data for a real identity.
 *
 * Usage: npx tsx src/cli/claim-data.ts --token iqt-abc123...
 */

import { createInterface } from "node:readline";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "../db/schema";
import { eq } from "drizzle-orm";
import crypto from "node:crypto";
import path from "node:path";
import fs from "node:fs";

const SENTINEL_IDENTITY_ID = 1;

// Parse --token argument
const tokenIdx = process.argv.indexOf("--token");
if (tokenIdx === -1 || !process.argv[tokenIdx + 1]) {
  console.error("Usage: npx tsx src/cli/claim-data.ts --token <iqt-...>");
  process.exit(1);
}

const token = process.argv[tokenIdx + 1];

if (!token.startsWith("iqt-")) {
  console.error("Error: Token must start with 'iqt-'");
  process.exit(1);
}

// Set up database
const dbPath = process.env.DATABASE_URL || "./data/interruptq.db";
const resolvedPath = path.resolve(dbPath);

if (!fs.existsSync(resolvedPath)) {
  console.error(`Error: Database not found at ${resolvedPath}`);
  process.exit(1);
}

const sqlite = new Database(resolvedPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

const db = drizzle(sqlite, { schema });

// Run migrations to ensure schema is up to date
migrate(db, { migrationsFolder: path.resolve(process.cwd(), "drizzle") });

// Hash the token and look up the identity
const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
const identity = db
  .select()
  .from(schema.identities)
  .where(eq(schema.identities.tokenHash, tokenHash))
  .get();

if (!identity) {
  console.error("Error: Token does not match any identity.");
  process.exit(1);
}

console.log(`Found identity: id=${identity.id}`);

// Count rows to be reassigned
const tables = [
  { name: "sprints", table: schema.sprints },
  { name: "activities", table: schema.activities },
  { name: "sprint_goal_snapshots", table: schema.sprintGoalSnapshots },
  { name: "priority_snapshots", table: schema.prioritySnapshots },
  { name: "on_call_changes", table: schema.onCallChanges },
  { name: "known_tags", table: schema.knownTags },
  { name: "preferences", table: schema.preferences },
] as const;

const counts: Record<string, number> = {};
let totalRows = 0;

for (const { name, table } of tables) {
  const rows = db
    .select()
    .from(table)
    .where(eq(table.identityId, SENTINEL_IDENTITY_ID))
    .all();
  counts[name] = rows.length;
  totalRows += rows.length;
}

if (totalRows === 0) {
  console.log("No data to claim. The sentinel identity has no associated data.");
  process.exit(0);
}

console.log("\nRows to reassign from sentinel identity to your identity:");
for (const [name, count] of Object.entries(counts)) {
  if (count > 0) {
    console.log(`  ${name}: ${count}`);
  }
}
console.log(`  Total: ${totalRows}\n`);

// Confirm
const rl = createInterface({ input: process.stdin, output: process.stdout });

rl.question("Proceed? (y/n) ", (answer) => {
  rl.close();

  if (answer.toLowerCase() !== "y") {
    console.log("Aborted.");
    process.exit(0);
  }

  // Reassign all rows
  for (const { name, table } of tables) {
    if (counts[name] > 0) {
      db.update(table)
        .set({ identityId: identity.id } as Record<string, unknown>)
        .where(eq(table.identityId, SENTINEL_IDENTITY_ID))
        .run();
      console.log(`  ${name}: ${counts[name]} rows reassigned`);
    }
  }

  console.log("\nDone! All data has been claimed.");
  sqlite.close();
  process.exit(0);
});
