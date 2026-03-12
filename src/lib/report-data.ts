import { db } from "@/db/index";
import {
  activities,
  preferences,
  sprintGoalSnapshots,
  prioritySnapshots,
  onCallChanges,
  sprints,
} from "@/db/schema";
import { eq, and, gte, lte, desc, isNull } from "drizzle-orm";
import { computeBlockDuration } from "@/lib/time";
import { computeMetrics, type RangeMetrics } from "@/lib/metrics";
import type { WorkingHours } from "@/types";

export interface ReportPayload extends RangeMetrics {
  goalChangeCount: number;
  priorityChangeCount: number;
  onCallMinutes: number;
  onCallTicketMinutes: number;
  goalProgress: { goal: string; minutes: number }[];
}

/**
 * Compute full report data for an identity within a date range.
 * Shared between the authenticated /api/reports route and the share link report route.
 */
export function computeReportData(
  identityId: number,
  from: string,
  to: string
): { data: ReportPayload } | { error: string } {
  const rangeStart = `${from}T00:00:00`;
  const rangeEnd = `${to}T23:59:59`;

  let rows = db
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

  // Include the last activity before the range (it may span into the range)
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

  if (prior && !rows.find((r) => r.id === prior.id)) {
    rows = [prior, ...rows];
  }

  // Get working hours
  const prefs = db
    .select()
    .from(preferences)
    .where(eq(preferences.identityId, identityId))
    .get();
  const workingHours: WorkingHours = prefs
    ? JSON.parse(prefs.workingHours)
    : null;

  if (!workingHours) {
    return { error: "No preferences" };
  }

  // Compute durations
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

  // Sprint-specific data
  const currentSprint = db
    .select()
    .from(sprints)
    .where(
      and(eq(sprints.identityId, identityId), isNull(sprints.endDate))
    )
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

  // On-call metrics
  const onCallPrefix = prefs?.onCallPrefix ?? "CALL";
  let onCallMinutes = 0;
  let onCallTicketMinutes = 0;

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

  return {
    data: {
      ...metrics,
      goalChangeCount,
      priorityChangeCount,
      onCallMinutes,
      onCallTicketMinutes,
      goalProgress,
    },
  };
}

/**
 * Compute export data (activities with durations) for an identity within a date range.
 * Shared between the authenticated /api/export route and the share link export route.
 */
export function computeExportData(
  identityId: number,
  from: string,
  to: string
) {
  const result = computeReportData(identityId, from, to);
  if ("error" in result) return result;
  return { data: result.data, from, to };
}
