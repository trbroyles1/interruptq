import { NextResponse } from "next/server";
import { db } from "@/db/index";
import {
  activities,
  preferences,
  sprintGoalSnapshots,
  prioritySnapshots,
  sprints,
} from "@/db/schema";
import { ensureDb } from "@/db/init";
import { eq, and, gte, lte, desc, isNull } from "drizzle-orm";
import { computeBlockDuration } from "@/lib/time";
import { computeMetrics } from "@/lib/metrics";
import { generateTextExport } from "@/lib/export-text";
import type { WorkingHours } from "@/types";

ensureDb();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const format = searchParams.get("format") ?? "text";

  if (!from || !to) {
    return NextResponse.json(
      { error: "from and to query params required" },
      { status: 400 }
    );
  }

  const rangeStart = `${from}T00:00:00`;
  const rangeEnd = `${to}T23:59:59`;

  let rows = db
    .select()
    .from(activities)
    .where(
      and(gte(activities.timestamp, rangeStart), lte(activities.timestamp, rangeEnd))
    )
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

  const prefs = db.select().from(preferences).where(eq(preferences.id, 1)).get();
  const workingHours: WorkingHours = prefs ? JSON.parse(prefs.workingHours) : null;

  if (!workingHours) {
    return NextResponse.json({ error: "No preferences" }, { status: 500 });
  }

  const now = new Date().toISOString();
  const withDuration = rows.map((row, i) => {
    const nextRow = rows[i + 1];
    const endTime = nextRow ? nextRow.timestamp : now;
    return {
      ...row,
      tickets: JSON.parse(row.tickets) as string[],
      tags: JSON.parse(row.tags) as string[],
      durationMinutes: computeBlockDuration(row.timestamp, endTime, workingHours),
    };
  });

  const metrics = computeMetrics(withDuration);

  // Sprint data
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
    const goalSnaps = db
      .select()
      .from(sprintGoalSnapshots)
      .where(eq(sprintGoalSnapshots.sprintId, currentSprint.id))
      .all();
    goalChangeCount = Math.max(0, goalSnaps.length - 1);
    const latest = goalSnaps.sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
    if (latest) sprintGoals = JSON.parse(latest.goals);

    const prioritySnaps = db
      .select()
      .from(prioritySnapshots)
      .where(eq(prioritySnapshots.sprintId, currentSprint.id))
      .all();
    priorityChangeCount = Math.max(0, prioritySnaps.length - 1);
  }

  const onCallPrefix = prefs?.onCallPrefix ?? "CALL";
  let onCallMinutes = 0;
  let onCallTicketMinutes = 0;
  for (const a of withDuration) {
    if (a.classification === "break") continue;
    if (a.onCallAtTime) onCallMinutes += a.durationMinutes;
    if (a.tickets.some((t: string) => t.toUpperCase().startsWith(onCallPrefix.toUpperCase() + "-")))
      onCallTicketMinutes += a.durationMinutes;
  }

  const goalProgress = sprintGoals.map((goal) => ({
    goal,
    minutes: withDuration
      .filter((a) => a.tickets.some((t: string) => t.toUpperCase() === goal.toUpperCase()))
      .reduce((s, a) => s + a.durationMinutes, 0),
  }));

  if (format === "text") {
    const text = generateTextExport({
      ...metrics,
      goalChangeCount,
      priorityChangeCount,
      onCallMinutes,
      onCallTicketMinutes,
      goalProgress,
      from,
      to,
    });

    return new Response(text, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // PDF format - return structured data for now (PDF generation can be added later)
  return NextResponse.json({
    error: "PDF export not yet implemented. Use format=text.",
  }, { status: 501 });
}
