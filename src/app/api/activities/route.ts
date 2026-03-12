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
import type { Classification, PriorityItem, WorkingHours } from "@/types";

ensureDb();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  // Build query conditions
  let rows;
  if (date) {
    // Single day: get activities from that day + the last activity before that day
    const dayStart = `${date}T00:00:00`;
    const dayEnd = `${date}T23:59:59`;
    rows = db
      .select()
      .from(activities)
      .where(and(gte(activities.timestamp, dayStart), lte(activities.timestamp, dayEnd)))
      .orderBy(activities.timestamp)
      .all();

    // Also get the last activity before this day (it may span into this day)
    const prior = db
      .select()
      .from(activities)
      .where(lte(activities.timestamp, dayStart))
      .orderBy(desc(activities.timestamp))
      .limit(1)
      .get();

    if (prior && !rows.find((r) => r.id === prior.id)) {
      rows = [prior, ...rows];
    }
  } else if (from && to) {
    const rangeStart = `${from}T00:00:00`;
    const rangeEnd = `${to}T23:59:59`;
    rows = db
      .select()
      .from(activities)
      .where(and(gte(activities.timestamp, rangeStart), lte(activities.timestamp, rangeEnd)))
      .orderBy(activities.timestamp)
      .all();

    const prior = db
      .select()
      .from(activities)
      .where(lte(activities.timestamp, rangeStart))
      .orderBy(desc(activities.timestamp))
      .limit(1)
      .get();

    if (prior && !rows.find((r) => r.id === prior.id)) {
      rows = [prior, ...rows];
    }
  } else {
    // Default: today
    const today = new Date().toISOString().split("T")[0];
    const dayStart = `${today}T00:00:00`;
    const dayEnd = `${today}T23:59:59`;
    rows = db
      .select()
      .from(activities)
      .where(and(gte(activities.timestamp, dayStart), lte(activities.timestamp, dayEnd)))
      .orderBy(activities.timestamp)
      .all();

    const prior = db
      .select()
      .from(activities)
      .where(lte(activities.timestamp, dayStart))
      .orderBy(desc(activities.timestamp))
      .limit(1)
      .get();

    if (prior && !rows.find((r) => r.id === prior.id)) {
      rows = [prior, ...rows];
    }
  }

  // Get working hours for duration computation
  const prefs = db.select().from(preferences).where(eq(preferences.id, 1)).get();
  const workingHours: WorkingHours = prefs
    ? JSON.parse(prefs.workingHours)
    : null;

  // Compute durations
  const withDuration = rows.map((row, i) => {
    const nextRow = rows[i + 1];
    const endTime = nextRow
      ? nextRow.timestamp
      : new Date().toISOString(); // ongoing activity

    const durationMinutes = workingHours
      ? computeBlockDuration(row.timestamp, endTime, workingHours)
      : 0;

    return {
      ...row,
      tickets: JSON.parse(row.tickets),
      tags: JSON.parse(row.tags),
      durationMinutes,
      isOngoing: !nextRow,
    };
  });

  return NextResponse.json(withDuration);
}

export async function POST(request: Request) {
  const body = await request.json();
  const isBreak = body.isBreak === true;

  // Guard against double-break: if already on break, return existing entry (no-op per spec §7)
  if (isBreak) {
    const latest = db
      .select()
      .from(activities)
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

  const now = body.timestamp || new Date().toISOString();

  // Get current sprint
  const currentSprint = db
    .select()
    .from(sprints)
    .where(isNull(sprints.endDate))
    .limit(1)
    .get();

  // Get current on-call status
  const latestOnCall = db
    .select()
    .from(onCallChanges)
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

    // Get on-call prefix from preferences
    const prefs = db.select().from(preferences).where(eq(preferences.id, 1)).get();
    const onCallPrefix = prefs?.onCallPrefix ?? "CALL";

    // Get current sprint goals
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

    // Get current priorities
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

    // Classify
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
      .values({ name: tag })
      .onConflictDoNothing()
      .run();
  }

  return NextResponse.json({
    ...activity,
    tickets: parsed.tickets,
    tags: parsed.tags,
  });
}
