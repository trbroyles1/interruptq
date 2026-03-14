#!/usr/bin/env npx tsx

/**
 * Seed a test identity with randomized activity data for smoke testing.
 *
 * Usage: npx tsx scripts/seed-test-data.ts --weeks 3
 */

import crypto from "node:crypto";
import fs from "node:fs";

// Load .env before any DB imports so DB_DRIVER / DATABASE_URL are available.
// Must happen before dynamic imports below since ESM hoists static imports.
if (fs.existsSync(".env")) process.loadEnvFile();

const { getDbDriver, getDbUrl } = await import("@/db/config");
const driver = getDbDriver();
const dbUrl = getDbUrl();
console.log(`Database: ${driver} → ${driver === "postgres" ? dbUrl.replace(/\/\/.*@/, "//***@") : dbUrl}`);

const { db } = await import("@/db/index");
const { run, returningFirst } = await import("@/db/helpers");

const schema =
  getDbDriver() === "postgres"
    ? await import("@/db/schema.pg")
    : await import("@/db/schema");

const {
  identities,
  sprints,
  activities,
  sprintGoalSnapshots,
  prioritySnapshots,
  onCallChanges,
  knownTags,
  preferences,
} = schema;

// ---------------------------------------------------------------------------
// Tunable knobs
// ---------------------------------------------------------------------------

const ACTIVITIES_PER_DAY_MIN = 8;
const ACTIVITIES_PER_DAY_MAX = 15;
const BREAK_PROBABILITY = 0.08;
const ONCALL_DAYS_PER_SPRINT = 2;
const TICKETS_PER_WEEK = 5;
const ONCALL_TICKETS_PER_WEEK = 2;
const PEOPLE_PER_WEEK = 3;
const SPRINT_LENGTH_DAYS = 14;
const GOALS_PER_SPRINT_MIN = 3;
const GOALS_PER_SPRINT_MAX = 5;
const PRIORITIES_PER_SPRINT_MIN = 2;
const PRIORITIES_PER_SPRINT_MAX = 4;
const WORK_START_HOUR = 9;
const WORK_END_HOUR = 17;
const TICKET_PREFIX = "SEED";
const ONCALL_PREFIX = "CALL";

const DEFAULT_TIMEZONE = "America/New_York";

// ---------------------------------------------------------------------------
// Text pools
// ---------------------------------------------------------------------------

const PEOPLE_NAMES = [
  "Alice", "Bob", "Carol", "Dave", "Eve", "Frank", "Grace", "Hank",
  "Irene", "Jake", "Karen", "Leo", "Mona", "Nate", "Olive", "Paul",
  "Quinn", "Rosa", "Steve", "Tina",
];

const WORK_VERBS = [
  "Working on", "Debugging", "Reviewing PR for", "Writing tests for",
  "Implementing", "Refactoring", "Investigating", "Deploying fix for",
  "Documenting", "Optimizing",
];

const INTERRUPT_PHRASES = [
  "Responding to Slack about", "Unplanned meeting about",
  "Helping with", "Ad-hoc request for", "Troubleshooting",
  "Context switch to", "Quick fix for", "Fire-fighting",
];

const ONCALL_VERBS = [
  "Triaging", "Responding to alert for", "Investigating incident",
  "Hotfixing", "Escalation for", "On-call page:",
];

const MEETING_PHRASES = [
  "Sprint planning with", "Standup with", "Retro with", "1:1 with",
  "Design review with", "Architecture discussion with",
];

const FREETEXT_PRIORITIES = [
  "Code reviews", "Tech debt cleanup", "CI pipeline improvements",
  "Documentation updates", "Dependency upgrades", "Monitoring setup",
  "Performance profiling", "Security audit items",
];

const BREAK_TEXTS = [
  "Lunch break", "Coffee break", "Short break", "Walk break",
];

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

function isWeekday(dateStr: string): boolean {
  const dow = new Date(`${dateStr}T12:00:00Z`).getUTCDay();
  return dow >= 1 && dow <= 5;
}

function todayInTimezone(tz: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());
}

/**
 * Convert a local time in a given IANA timezone to a UTC ISO string.
 * Uses Intl to determine the correct UTC offset (handles DST).
 */
function localToUtcIso(
  dateStr: string,
  hours: number,
  minutes: number,
  tz: string,
): string {
  // Use a reference point near the target time to get the correct offset
  const ref = new Date(`${dateStr}T${pad2(hours)}:${pad2(minutes)}:00Z`);
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    timeZoneName: "longOffset",
  }).formatToParts(ref);

  const tzPart = formatted.find((p) => p.type === "timeZoneName")?.value ?? "";
  const match = tzPart.match(/GMT([+-])(\d{2}):(\d{2})/);

  let offsetMs = 0;
  if (match) {
    const sign = match[1] === "+" ? 1 : -1;
    offsetMs =
      sign *
      (Number.parseInt(match[2]) * 60 + Number.parseInt(match[3])) *
      60_000;
  }

  // local = UTC + offset, so UTC = local - offset
  const naiveMs = ref.getTime(); // we treated local time as UTC
  const utcMs = naiveMs - offsetMs;
  return new Date(utcMs).toISOString();
}

/**
 * Get the current hour and minute in the given timezone.
 */
function nowInTimezone(tz: string): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(new Date());
  return {
    hour: Number(parts.find((p) => p.type === "hour")?.value ?? 0),
    minute: Number(parts.find((p) => p.type === "minute")?.value ?? 0),
  };
}

// Inline token generation (same logic as src/lib/identity.ts)
const TOKEN_PREFIX = "iqt-";
const TOKEN_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

function generateToken(): string {
  const bytes = crypto.randomBytes(32);
  let result = TOKEN_PREFIX;
  for (let i = 0; i < 32; i++) {
    result += TOKEN_CHARS[bytes[i] % TOKEN_CHARS.length];
  }
  return result;
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// ---------------------------------------------------------------------------
// Data generation
// ---------------------------------------------------------------------------

interface SprintRecord {
  id: number;
  ordinal: number;
  startDate: string;
  endDate: string | null;
  goals: string[];
  priorities: Array<{ type: "ticket" | "text"; value: string }>;
}

function sprintForDate(
  dateStr: string,
  sprintRecords: SprintRecord[],
): SprintRecord | undefined {
  return sprintRecords.find(
    (s) => dateStr >= s.startDate && (!s.endDate || dateStr <= s.endDate),
  );
}

type ActivityKind = "goal" | "priority" | "oncall" | "interrupt" | "break";

function rollActivityKind(isOnCall: boolean): ActivityKind {
  const r = Math.random();
  if (r < BREAK_PROBABILITY) return "break";
  if (isOnCall) {
    if (r < 0.40) return "oncall";
    if (r < 0.60) return "priority";
    return "interrupt";
  }
  if (r < 0.42) return "goal";
  if (r < 0.67) return "priority";
  return "interrupt";
}

interface GeneratedActivity {
  timestamp: string;
  text: string;
  tickets: string[];
  tags: string[];
  classification: "green" | "yellow" | "red" | "break";
  onCallAtTime: boolean;
  sprintId: number | null;
}

function buildActivity(
  kind: ActivityKind,
  sprint: SprintRecord | undefined,
  oncallTicketPool: string[],
  interruptTicketPool: string[],
  peoplePool: string[],
  isOnCall: boolean,
): Omit<GeneratedActivity, "timestamp" | "sprintId"> {
  const tickets: string[] = [];
  const tags: string[] = [];
  let text: string;
  let classification: GeneratedActivity["classification"];

  switch (kind) {
    case "break": {
      text = pick(BREAK_TEXTS);
      classification = "break";
      break;
    }
    case "goal": {
      const ticket = sprint ? pick(sprint.goals) : pick(interruptTicketPool);
      tickets.push(ticket);
      text = `${pick(WORK_VERBS)} ${ticket}`;
      if (Math.random() < 0.35 && peoplePool.length > 0) {
        const person = pick(peoplePool);
        tags.push(person);
        text += ` with @${person}`;
      }
      classification = "green";
      break;
    }
    case "oncall": {
      const ticket = pick(oncallTicketPool);
      tickets.push(ticket);
      text = `${pick(ONCALL_VERBS)} ${ticket}`;
      if (Math.random() < 0.3 && peoplePool.length > 0) {
        const person = pick(peoplePool);
        tags.push(person);
        text += ` with @${person}`;
      }
      classification = "green";
      break;
    }
    case "priority": {
      if (sprint && sprint.priorities.length > 0) {
        const pri = pick(sprint.priorities);
        if (pri.type === "ticket") {
          tickets.push(pri.value);
          text = `${pick(WORK_VERBS)} ${pri.value}`;
        } else {
          text = `${pri.value}`;
          // Sometimes attach a random ticket for realism
          if (Math.random() < 0.3 && interruptTicketPool.length > 0) {
            const ticket = pick(interruptTicketPool);
            tickets.push(ticket);
            text += ` - ${ticket}`;
          }
        }
      } else {
        text = pick(FREETEXT_PRIORITIES);
      }
      if (Math.random() < 0.3 && peoplePool.length > 0) {
        const person = pick(peoplePool);
        tags.push(person);
        text += ` with @${person}`;
      }
      classification = "yellow";
      break;
    }
    case "interrupt": {
      // Mix of ticket-based and meeting-based interrupts
      if (Math.random() < 0.6 && interruptTicketPool.length > 0) {
        const ticket = pick(interruptTicketPool);
        tickets.push(ticket);
        text = `${pick(INTERRUPT_PHRASES)} ${ticket}`;
      } else if (peoplePool.length > 0) {
        const person = pick(peoplePool);
        tags.push(person);
        text = `${pick(MEETING_PHRASES)} @${person}`;
      } else {
        text = `${pick(INTERRUPT_PHRASES)} production issue`;
      }
      classification = "red";
      break;
    }
  }

  return { text, tickets, tags, classification, onCallAtTime: isOnCall };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  // Parse --weeks argument
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

  const tz = DEFAULT_TIMEZONE;
  const today = todayInTimezone(tz);
  const { hour: nowHour, minute: nowMinute } = nowInTimezone(tz);

  // ---- 1. Create identity + preferences ----

  const token = generateToken();
  const tokenHash = hashToken(token);

  const identity = await returningFirst<{ id: number }>(
    db.insert(identities).values({ tokenHash }).returning(),
  );
  if (!identity?.id) {
    throw new Error("Failed to create identity — insert returned no row");
  }
  const identityId = identity.id;

  await run(db.insert(preferences).values({ identityId }));

  // ---- 2. Compute time window and workdays ----

  const windowStart = addDays(today, -(weeks * 7));
  const workdays: string[] = [];
  let cursor = addDays(windowStart, 1); // start day after windowStart
  while (cursor <= today) {
    if (isWeekday(cursor)) workdays.push(cursor);
    cursor = addDays(cursor, 1);
  }

  // ---- 3. Create sprints ----

  const sprintDefs: Array<{ startDate: string; endDate: string | null }> = [];
  let sprintStart = addDays(windowStart, 1);
  while (sprintStart <= today) {
    const candidateEnd = addDays(sprintStart, SPRINT_LENGTH_DAYS - 1);
    if (candidateEnd >= today) {
      // Current sprint — leave open
      sprintDefs.push({ startDate: sprintStart, endDate: null });
      break;
    }
    sprintDefs.push({ startDate: sprintStart, endDate: candidateEnd });
    sprintStart = addDays(candidateEnd, 1);
  }
  // Edge case: if no sprint was created (very short window)
  if (sprintDefs.length === 0) {
    sprintDefs.push({ startDate: addDays(windowStart, 1), endDate: null });
  }

  const sprintRecords: SprintRecord[] = [];
  for (let i = 0; i < sprintDefs.length; i++) {
    const def = sprintDefs[i];
    const row = await returningFirst<{ id: number }>(
      db
        .insert(sprints)
        .values({
          identityId,
          ordinal: i + 1,
          startDate: def.startDate,
          endDate: def.endDate,
        })
        .returning(),
    );
    sprintRecords.push({
      id: row.id,
      ordinal: i + 1,
      startDate: def.startDate,
      endDate: def.endDate,
      goals: [],
      priorities: [],
    });
  }

  // ---- 4. Generate ticket and people pools ----

  const ticketCount = Math.max(5, weeks * TICKETS_PER_WEEK);
  const oncallTicketCount = Math.max(3, weeks * ONCALL_TICKETS_PER_WEEK);
  const peopleCount = Math.min(PEOPLE_NAMES.length, Math.max(3, weeks * PEOPLE_PER_WEEK));

  const ticketPool = Array.from({ length: ticketCount }, (_, i) => `${TICKET_PREFIX}-${i + 1}`);
  const oncallTicketPool = Array.from({ length: oncallTicketCount }, (_, i) => `${ONCALL_PREFIX}-${i + 1}`);
  const peoplePool = pickN(PEOPLE_NAMES, peopleCount);

  // ---- 5. Set goals + priorities per sprint ----

  for (const sprint of sprintRecords) {
    const goalCount = randInt(GOALS_PER_SPRINT_MIN, GOALS_PER_SPRINT_MAX);
    sprint.goals = pickN(ticketPool, goalCount);

    const priCount = randInt(PRIORITIES_PER_SPRINT_MIN, PRIORITIES_PER_SPRINT_MAX);
    const priTickets = pickN(
      ticketPool.filter((t) => !sprint.goals.includes(t)),
      Math.ceil(priCount / 2),
    );
    const priTexts = pickN(FREETEXT_PRIORITIES, Math.floor(priCount / 2));
    sprint.priorities = [
      ...priTickets.map((t) => ({ type: "ticket" as const, value: t })),
      ...priTexts.map((t) => ({ type: "text" as const, value: t })),
    ];

    const snapshotTs = localToUtcIso(sprint.startDate, WORK_START_HOUR, 0, tz);

    await run(
      db.insert(sprintGoalSnapshots).values({
        identityId,
        sprintId: sprint.id,
        timestamp: snapshotTs,
        goals: JSON.stringify(sprint.goals),
      }),
    );
    await run(
      db.insert(prioritySnapshots).values({
        identityId,
        sprintId: sprint.id,
        timestamp: snapshotTs,
        priorities: JSON.stringify(sprint.priorities),
      }),
    );
  }

  // ---- 6. Determine on-call windows ----

  const oncallDays = new Set<string>();

  for (const sprint of sprintRecords) {
    const sprintWorkdays = workdays.filter(
      (d) => d >= sprint.startDate && (!sprint.endDate || d <= sprint.endDate),
    );
    if (sprintWorkdays.length < ONCALL_DAYS_PER_SPRINT + 1) continue;

    // Pick a random start index leaving room for the window
    const maxStart = sprintWorkdays.length - ONCALL_DAYS_PER_SPRINT;
    const startIdx = randInt(0, maxStart);

    for (let i = 0; i < ONCALL_DAYS_PER_SPRINT; i++) {
      oncallDays.add(sprintWorkdays[startIdx + i]);
    }

    // Insert on-call toggle ON at start of first day, OFF at end of last day
    const onDay = sprintWorkdays[startIdx];
    const offDay = sprintWorkdays[startIdx + ONCALL_DAYS_PER_SPRINT - 1];

    await run(
      db.insert(onCallChanges).values({
        identityId,
        timestamp: localToUtcIso(onDay, WORK_START_HOUR, 0, tz),
        status: true,
      }),
    );
    await run(
      db.insert(onCallChanges).values({
        identityId,
        timestamp: localToUtcIso(offDay, WORK_END_HOUR, 0, tz),
        status: false,
      }),
    );
  }

  // ---- 7. Generate activities ----

  // Build a pool of "interrupt" tickets — those not in any sprint's goals/priorities
  const goalAndPriTickets = new Set(
    sprintRecords.flatMap((s) => [
      ...s.goals,
      ...s.priorities.filter((p) => p.type === "ticket").map((p) => p.value),
    ]),
  );
  const interruptTicketPool = ticketPool.filter((t) => !goalAndPriTickets.has(t));
  // If everything ended up as goal/priority, use the full pool for interrupts
  const effectiveInterruptPool =
    interruptTicketPool.length > 0 ? interruptTicketPool : ticketPool;

  let totalActivities = 0;
  const activityBatch: Array<{
    identityId: number;
    timestamp: string;
    text: string;
    tickets: string;
    tags: string;
    classification: string;
    sprintId: number | null;
    onCallAtTime: boolean;
  }> = [];

  for (const day of workdays) {
    const sprint = sprintForDate(day, sprintRecords);
    const isOnCall = oncallDays.has(day);
    const isToday = day === today;

    // Determine end hour for today
    const endHour = isToday ? Math.min(nowHour, WORK_END_HOUR) : WORK_END_HOUR;
    const endMinute = isToday && nowHour < WORK_END_HOUR ? nowMinute : 0;
    const totalMinutes =
      (endHour - WORK_START_HOUR) * 60 + endMinute;

    if (totalMinutes <= 0) continue; // today is before work start

    const numActivities = randInt(ACTIVITIES_PER_DAY_MIN, ACTIVITIES_PER_DAY_MAX);
    const spacing = totalMinutes / numActivities;
    let lastWasBreak = false;

    for (let i = 0; i < numActivities; i++) {
      // Spread across the day with jitter
      const baseMinute = Math.floor(i * spacing);
      const jitter = Math.floor(Math.random() * Math.max(1, spacing * 0.4));
      const minuteOffset = Math.min(baseMinute + jitter, totalMinutes - 1);
      const hour = WORK_START_HOUR + Math.floor(minuteOffset / 60);
      const minute = minuteOffset % 60;
      const timestamp = localToUtcIso(day, hour, minute, tz);

      let kind = rollActivityKind(isOnCall);
      // Prevent consecutive breaks
      if (kind === "break" && lastWasBreak) {
        kind = isOnCall ? "oncall" : "goal";
      }
      lastWasBreak = kind === "break";

      const act = buildActivity(
        kind,
        sprint,
        oncallTicketPool,
        effectiveInterruptPool,
        peoplePool,
        isOnCall,
      );

      activityBatch.push({
        identityId,
        timestamp,
        text: act.text,
        tickets: JSON.stringify(act.tickets),
        tags: JSON.stringify(act.tags),
        classification: act.classification,
        sprintId: sprint?.id ?? null,
        onCallAtTime: act.onCallAtTime,
      });
      totalActivities++;
    }
  }

  // Batch insert activities (chunks of 500)
  const BATCH_SIZE = 500;
  for (let i = 0; i < activityBatch.length; i += BATCH_SIZE) {
    const batch = activityBatch.slice(i, i + BATCH_SIZE);
    await run(db.insert(activities).values(batch));
  }

  // ---- 8. Insert known tags ----

  for (const name of peoplePool) {
    await run(db.insert(knownTags).values({ identityId, name }));
  }

  // ---- 9. Summary ----

  console.log(`\nSeeded identity token: ${token}`);
  console.log(`  Weeks:        ${weeks}`);
  console.log(`  Sprints:      ${sprintRecords.length}`);
  console.log(`  Activities:   ${totalActivities}`);
  console.log(`  On-call days: ${oncallDays.size}`);
  console.log(`  Tickets:      ${ticketPool.length + oncallTicketPool.length}`);
  console.log(`  People:       ${peoplePool.length}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
