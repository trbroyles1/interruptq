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
} from "@/db/tables";
import { first, all, run, returningFirst } from "@/db/helpers";
import { ensureDb } from "@/db/init";
import { eq, desc, isNull, and, gte, lte } from "drizzle-orm";
import { parseEntry } from "@/lib/parse";
import { classify } from "@/lib/classify";
import { computeBlockDuration } from "@/lib/time";
import { withIdentity } from "@/lib/auth";
import { dayBoundsUTC, todayInTz, nowUTC } from "@/lib/timezone";
import type { Classification, PriorityItem, WorkingHours } from "@/types";

/**
 * Helper: fetch activities within UTC bounds.
 * Also returns the prior activity (last before range start) separately —
 * it's needed for computing the first in-range activity's duration but
 * should NOT be displayed in the timeline.
 */
async function fetchActivitiesInRange(
  identityId: number,
  rangeStart: string,
  rangeEnd: string
) {
  const rows = await all(db
    .select()
    .from(activities)
    .where(
      and(
        eq(activities.identityId, identityId),
        gte(activities.timestamp, rangeStart),
        lte(activities.timestamp, rangeEnd)
      )
    )
    .orderBy(activities.timestamp));

  const prior = await first(db
    .select()
    .from(activities)
    .where(
      and(
        eq(activities.identityId, identityId),
        lte(activities.timestamp, rangeStart)
      )
    )
    .orderBy(desc(activities.timestamp))
    .limit(1));

  return { rows, prior: prior && !rows.find((r) => r.id === prior.id) ? prior : null };
}

export const GET = withIdentity(async (request: Request, identityId: number) => {
  await ensureDb();
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  // Fetch preferences first — needed for timezone and working hours
  const prefs = await first(db
    .select()
    .from(preferences)
    .where(eq(preferences.identityId, identityId)));
  const workingHours: WorkingHours = prefs
    ? JSON.parse(prefs.workingHours)
    : null;
  const tz = prefs?.timezone ?? "America/New_York";

  let bounds: { start: string; end: string };
  if (date) {
    bounds = dayBoundsUTC(date, tz);
  } else if (from && to) {
    bounds = { start: dayBoundsUTC(from, tz).start, end: dayBoundsUTC(to, tz).end };
  } else {
    const today = todayInTz(tz);
    bounds = dayBoundsUTC(today, tz);
  }

  const { rows, prior } = await fetchActivitiesInRange(identityId, bounds.start, bounds.end);
  // Build full list with prior prepended (for duration computation only)
  const allRows = prior ? [prior, ...rows] : rows;

  // Compute durations using the full list (prior provides end boundary for first row)
  const now = nowUTC();
  // Clamp the last activity's end to the range boundary so historical days
  // don't bleed into future days. For today, now < rangeEnd so now wins.
  const effectiveEnd = now < bounds.end ? now : bounds.end;
  const withDuration = allRows.map((row, i) => {
    const nextRow = allRows[i + 1];
    const endTime = nextRow ? nextRow.timestamp : effectiveEnd;

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
  await ensureDb();
  const body = await request.json();
  const isBreak = body.isBreak === true;

  // Guard against double-break
  if (isBreak) {
    const latest = await first(db
      .select()
      .from(activities)
      .where(eq(activities.identityId, identityId))
      .orderBy(desc(activities.timestamp))
      .limit(1));
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
  const currentSprint = await first(db
    .select()
    .from(sprints)
    .where(
      and(eq(sprints.identityId, identityId), isNull(sprints.endDate))
    )
    .limit(1));

  // Get current on-call status
  const latestOnCall = await first(db
    .select()
    .from(onCallChanges)
    .where(eq(onCallChanges.identityId, identityId))
    .orderBy(desc(onCallChanges.timestamp))
    .limit(1));
  const isOnCall = latestOnCall?.status ?? false;

  let classification: Classification;
  let parsed: { tickets: string[]; tags: string[] };

  if (isBreak) {
    classification = "break";
    parsed = { tickets: [], tags: [] };
  } else {
    parsed = parseEntry(text);

    const prefs = await first(db
      .select()
      .from(preferences)
      .where(eq(preferences.identityId, identityId)));
    const onCallPrefix = prefs?.onCallPrefix ?? "CALL";

    let sprintGoals: string[] = [];
    if (currentSprint) {
      const goalSnapshot = await first(db
        .select()
        .from(sprintGoalSnapshots)
        .where(eq(sprintGoalSnapshots.sprintId, currentSprint.id))
        .orderBy(desc(sprintGoalSnapshots.timestamp))
        .limit(1));
      if (goalSnapshot) {
        sprintGoals = JSON.parse(goalSnapshot.goals);
      }
    }

    let priorities: PriorityItem[] = [];
    if (currentSprint) {
      const prioritySnapshot = await first(db
        .select()
        .from(prioritySnapshots)
        .where(eq(prioritySnapshots.sprintId, currentSprint.id))
        .orderBy(desc(prioritySnapshots.timestamp))
        .limit(1));
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
  const activity = await returningFirst(db
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
    .returning());

  // Persist any new @-tags
  for (const tag of parsed.tags) {
    await run(db.insert(knownTags)
      .values({ identityId, name: tag })
      .onConflictDoNothing());
  }

  return NextResponse.json({
    ...activity,
    tickets: parsed.tickets,
    tags: parsed.tags,
  });
});
