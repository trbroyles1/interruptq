import { NextResponse } from "next/server";
import { db } from "@/db/index";
import {
  activities,
  preferences,
  sprintGoalSnapshots,
  prioritySnapshots,
  onCallChanges,
  sprints,
} from "@/db/schema";
import { ensureDb } from "@/db/init";
import { eq, and, gte, lte, desc, isNull } from "drizzle-orm";
import { computeBlockDuration } from "@/lib/time";
import { computeMetrics } from "@/lib/metrics";
import type { WorkingHours, PriorityItem } from "@/types";

ensureDb();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!from || !to) {
    return NextResponse.json(
      { error: "from and to query params required" },
      { status: 400 }
    );
  }

  const rangeStart = `${from}T00:00:00`;
  const rangeEnd = `${to}T23:59:59`;

  // Fetch activities in range
  let rows = db
    .select()
    .from(activities)
    .where(
      and(gte(activities.timestamp, rangeStart), lte(activities.timestamp, rangeEnd))
    )
    .orderBy(activities.timestamp)
    .all();

  // Include the last activity before the range (it may span into the range)
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

  // Get working hours
  const prefs = db.select().from(preferences).where(eq(preferences.id, 1)).get();
  const workingHours: WorkingHours = prefs
    ? JSON.parse(prefs.workingHours)
    : null;

  if (!workingHours) {
    return NextResponse.json({ error: "No preferences" }, { status: 500 });
  }

  // Compute durations
  const now = new Date().toISOString();
  const withDuration = rows.map((row, i) => {
    const nextRow = rows[i + 1];
    // For the last (ongoing) activity, use current time, not end of range
    const endTime = nextRow ? nextRow.timestamp : now;
    const durationMinutes = computeBlockDuration(
      row.timestamp,
      endTime,
      workingHours
    );

    return {
      ...row,
      tickets: JSON.parse(row.tickets) as string[],
      tags: JSON.parse(row.tags) as string[],
      durationMinutes,
    };
  });

  const metrics = computeMetrics(withDuration);

  // Sprint-specific data
  const currentSprint = db
    .select()
    .from(sprints)
    .where(isNull(sprints.endDate))
    .limit(1)
    .get();

  let goalChangeCount = 0;
  let priorityChangeCount = 0;
  let sprintGoals: string[] = [];

  if (currentSprint) {
    const goalSnapshots = db
      .select()
      .from(sprintGoalSnapshots)
      .where(eq(sprintGoalSnapshots.sprintId, currentSprint.id))
      .all();
    goalChangeCount = Math.max(0, goalSnapshots.length - 1);

    const latestGoals = goalSnapshots.sort(
      (a, b) => b.timestamp.localeCompare(a.timestamp)
    )[0];
    if (latestGoals) {
      sprintGoals = JSON.parse(latestGoals.goals);
    }

    const prioritySnaps = db
      .select()
      .from(prioritySnapshots)
      .where(eq(prioritySnapshots.sprintId, currentSprint.id))
      .all();
    priorityChangeCount = Math.max(0, prioritySnaps.length - 1);
  }

  // On-call time
  const onCallRows = db
    .select()
    .from(onCallChanges)
    .orderBy(onCallChanges.timestamp)
    .all();

  let onCallMinutes = 0;
  let onCallTicketMinutes = 0;
  const onCallPrefix = prefs?.onCallPrefix ?? "CALL";

  for (const a of withDuration) {
    if (a.classification === "break") continue;
    if (a.onCallAtTime) {
      onCallMinutes += a.durationMinutes;
    }
    const hasOnCallTicket = a.tickets.some((t: string) =>
      t.toUpperCase().startsWith(onCallPrefix.toUpperCase() + "-")
    );
    if (hasOnCallTicket) {
      onCallTicketMinutes += a.durationMinutes;
    }
  }

  // Sprint goal progress
  const goalProgress = sprintGoals.map((goal) => {
    const minutes = withDuration
      .filter((a) =>
        a.tickets.some((t: string) => t.toUpperCase() === goal.toUpperCase())
      )
      .reduce((sum, a) => sum + a.durationMinutes, 0);
    return { goal, minutes };
  });

  return NextResponse.json({
    ...metrics,
    goalChangeCount,
    priorityChangeCount,
    onCallMinutes,
    onCallTicketMinutes,
    goalProgress,
  });
}
