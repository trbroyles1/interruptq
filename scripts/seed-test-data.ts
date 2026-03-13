#!/usr/bin/env npx tsx

/**
 * Seed a test identity with randomized activity data for smoke testing.
 *
 * Usage: npx tsx scripts/seed-test-data.ts --weeks 3
 */

import fs from "node:fs";

if (fs.existsSync(".env")) process.loadEnvFile();

const { getDbDriver, getDbUrl } = await import("@/db/config");
const driver = getDbDriver();
const dbUrl = getDbUrl();
console.log(`Database: ${driver} → ${driver === "postgres" ? dbUrl.replace(/\/\/.*@/, "//***@") : dbUrl}`);

const weeksIdx = process.argv.indexOf("--weeks");
if (weeksIdx === -1 || !process.argv[weeksIdx + 1]) {
  console.error("Usage: npx tsx scripts/seed-test-data.ts --weeks <N>");
  process.exit(1);
}
const weeks = Number.parseInt(process.argv[weeksIdx + 1]);
if (Number.isNaN(weeks) || weeks < 1) {
  console.error("Error: --weeks must be a positive integer");
  process.exit(1);
}

const { seedTestData } = await import("@/lib/seed-test-data");

seedTestData({ weeks })
  .then(({ token, summary }) => {
    console.log(`\nSeeded identity token: ${token}`);
    console.log(`  Weeks:        ${summary.weeks}`);
    console.log(`  Sprints:      ${summary.sprints}`);
    console.log(`  Activities:   ${summary.activities}`);
    console.log(`  On-call days: ${summary.oncallDays}`);
    console.log(`  Tickets:      ${summary.tickets}`);
    console.log(`  People:       ${summary.people}`);
    process.exit(0);
  })
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
