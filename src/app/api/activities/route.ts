import { NextResponse } from "next/server";
import { db } from "@/db/index";
import {
  activities,
  sprints,
  sprintGoalSnapshots,
  prioritySnapshots,
  onCallChanges,
  preferences,
  knownTags,
} from "@/db/schema";
import { ensureDb } from "@/db/init";
import { eq, desc, isNull, and, gte, lte } from "drizzle-orm";
import { parseEntry } from "@/lib/parse";
import { classify } from "@/lib/classify";
import { computeBlockDuration } from "@/lib/time";
import { withIdentity } from "@/lib/auth";
import { dayBoundsUTC, todayInTz, nowUTC } from "@/lib/timezone";
import type { Classification, PriorityItem, WorkingHours } from "@/types";

ensureDb();

/**
 * Helper: fetch activities within UTC bounds.
 * Also returns the prior activity (last before range start) separately —
 * it's needed for computing the first in-range activity's duration but
 * should NOT be displayed in the timeline.
 */
function fetchActivitiesInRange(
  identityId: number,
  rangeStart: string,
  rangeEnd: string
) {
  const rows = db
    .select()
    .from(activities)
    .where(
      and(
        eq(activities.identityId, identityId),
        gte(activities.timestamp, rangeStart),
        lte(activities.timestamp, rangeEnd)
      )
    )
    .orderBy(activities.timestamp)
    .all();

  const prior = db
    .select()
    .from(activities)
    .where(
      and(
        eq(activities.identityId, identityId),
        lte(activities.timestamp, rangeStart)
      )
    )
    .orderBy(desc(activities.timestamp))
    .limit(1)
    .get();

  return { rows, prior: prior && !rows.find((r) => r.id === prior.id) ? prior : null };
}

export const GET = withIdentity(async (request: Request, identityId: number) => {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  // Fetch preferences first — needed for timezone and working hours
  const prefs = db
    .select()
    .from(preferences)
    .where(eq(preferences.identityId, identityId))
    .get();
  const workingHours: WorkingHours = prefs
    ? JSON.parse(prefs.workingHours)
    : null;
  const tz = prefs?.timezone ?? "America/New_York";

  let result;
  if (date) {
    const bounds = dayBoundsUTC(date, tz);
    result = fetchActivitiesInRange(identityId, bounds.start, bounds.end);
  } else if (from && to) {
    const rangeStart = dayBoundsUTC(from, tz).start;
    const rangeEnd = dayBoundsUTC(to, tz).end;
    result = fetchActivitiesInRange(identityId, rangeStart, rangeEnd);
  } else {
    const today = todayInTz(tz);
    const bounds = dayBoundsUTC(today, tz);
    result = fetchActivitiesInRange(identityId, bounds.start, bounds.end);
  }

  const { rows, prior } = result;
  // Build full list with prior prepended (for duration computation only)
  const allRows = prior ? [prior, ...rows] : rows;

  // Compute durations using the full list (prior provides end boundary for first row)
  const now = nowUTC();
  const withDuration = allRows.map((row, i) => {
    const nextRow = allRows[i + 1];
    const endTime = nextRow ? nextRow.timestamp : now;

    const durationMinutes = workingHours
      ? computeBlockDuration(row.timestamp, endTime, workingHours, tz)
      : 0;

    return {
      ...row,
      tickets: JSON.parse(row.tickets),
      tags: JSON.parse(row.tags),
      durationMinutes,
      isOngoing: !nextRow,
    };
  });

  // Exclude the prior activity from the response — it's only needed for duration math
  const response = prior ? withDuration.slice(1) : withDuration;

  return NextResponse.json(response);
});

export const POST = withIdentity(async (request: Request, identityId: number) => {
  const body = await request.json();
  const isBreak = body.isBreak === true;

  // Guard against double-break
  if (isBreak) {
    const latest = db
      .select()
      .from(activities)
      .where(eq(activities.identityId, identityId))
      .orderBy(desc(activities.timestamp))
      .limit(1)
      .get();
    if (latest?.classification === "break") {
      return NextResponse.json(latest);
    }
  }

  const text: string = isBreak ? "Break" : body.text?.trim();

  if (!isBreak && !text) {
    return NextResponse.json({ error: "Text required" }, { status: 400 });
  }

  const now = body.timestamp || nowUTC();

  // Get current sprint
  const currentSprint = db
    .select()
    .from(sprints)
    .where(
      and(eq(sprints.identityId, identityId), isNull(sprints.endDate))
    )
    .limit(1)
    .get();

  // Get current on-call status
  const latestOnCall = db
    .select()
    .from(onCallChanges)
    .where(eq(onCallChanges.identityId, identityId))
    .orderBy(desc(onCallChanges.timestamp))
    .limit(1)
    .get();
  const isOnCall = latestOnCall?.status ?? false;

  let classification: Classification;
  let parsed: { tickets: string[]; tags: string[] };

  if (isBreak) {
    classification = "break";
    parsed = { tickets: [], tags: [] };
  } else {
    parsed = parseEntry(text);

    const prefs = db
      .select()
      .from(preferences)
      .where(eq(preferences.identityId, identityId))
      .get();
    const onCallPrefix = prefs?.onCallPrefix ?? "CALL";

    let sprintGoals: string[] = [];
    if (currentSprint) {
      const goalSnapshot = db
        .select()
        .from(sprintGoalSnapshots)
        .where(eq(sprintGoalSnapshots.sprintId, currentSprint.id))
        .orderBy(desc(sprintGoalSnapshots.timestamp))
        .limit(1)
        .get();
      if (goalSnapshot) {
        sprintGoals = JSON.parse(goalSnapshot.goals);
      }
    }

    let priorities: PriorityItem[] = [];
    if (currentSprint) {
      const prioritySnapshot = db
        .select()
        .from(prioritySnapshots)
        .where(eq(prioritySnapshots.sprintId, currentSprint.id))
        .orderBy(desc(prioritySnapshots.timestamp))
        .limit(1)
        .get();
      if (prioritySnapshot) {
        priorities = JSON.parse(prioritySnapshot.priorities);
      }
    }

    classification = classify({
      entryText: text,
      entryTickets: parsed.tickets,
      isOnCall,
      onCallPrefix,
      sprintGoals,
      priorities,
    });
  }

  // Persist activity
  const activity = db
    .insert(activities)
    .values({
      identityId,
      timestamp: now,
      text,
      tickets: JSON.stringify(parsed.tickets),
      tags: JSON.stringify(parsed.tags),
      classification,
      sprintId: currentSprint?.id ?? null,
      onCallAtTime: isOnCall,
    })
    .returning()
    .get();

  // Persist any new @-tags
  for (const tag of parsed.tags) {
    db.insert(knownTags)
      .values({ identityId, name: tag })
      .onConflictDoNothing()
      .run();
  }

  return NextResponse.json({
    ...activity,
    tickets: parsed.tickets,
    tags: parsed.tags,
  });
});
