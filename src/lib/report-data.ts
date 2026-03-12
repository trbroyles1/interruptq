import { db } from "@/db/index";
import {
  activities,
  preferences,
  sprintGoalSnapshots,
  prioritySnapshots,
  onCallChanges,
  sprints,
} from "@/db/tables";
import { first, all } from "@/db/helpers";
import { eq, and, gte, lte, desc, isNull } from "drizzle-orm";
import { computeBlockDuration } from "@/lib/time";
import { computeMetrics, type RangeMetrics } from "@/lib/metrics";
import { dayBoundsUTC, nowUTC } from "@/lib/timezone";
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
export async function computeReportData(
  identityId: number,
  from: string,
  to: string
): Promise<{ data: ReportPayload } | { error: string }> {
  // Get working hours and timezone first (needed for query boundaries)
  const prefs = await first(
    db
      .select()
      .from(preferences)
      .where(eq(preferences.identityId, identityId))
  );
  const workingHours: WorkingHours = prefs
    ? JSON.parse(prefs.workingHours)
    : null;

  if (!workingHours) {
    return { error: "No preferences" };
  }

  const tz = prefs?.timezone ?? "America/New_York";

  // Compute timezone-aware UTC boundaries for the date range
  const rangeStart = dayBoundsUTC(from, tz).start;
  const rangeEnd = dayBoundsUTC(to, tz).end;

  const rows = await all(
    db
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
  );

  // Include the last activity before the range (it may span into the range)
  const prior = await first(
    db
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
  );

  const hasPrior = prior && !rows.find((r) => r.id === prior.id);
  // Build full list with prior prepended for duration computation only.
  // The prior provides the end-boundary for computing the first in-range row's
  // "time since last activity", but the prior itself is excluded from metrics.
  const allRows = hasPrior ? [prior, ...rows] : rows;

  // Compute durations
  const now = nowUTC();
  // Clamp the last activity's end to the range boundary so historical days
  // don't bleed into future days. For today, now < rangeEnd so now wins.
  const effectiveEnd = now < rangeEnd ? now : rangeEnd;
  const allWithDuration = allRows.map((row, i) => {
    const nextRow = allRows[i + 1];
    const endTime = nextRow ? nextRow.timestamp : effectiveEnd;

    return {
      ...row,
      tickets: JSON.parse(row.tickets) as string[],
      tags: JSON.parse(row.tags) as string[],
      durationMinutes: computeBlockDuration(row.timestamp, endTime, workingHours, tz),
    };
  });

  // Exclude the prior — its duration spans outside the requested range
  // and including it inflates metrics with out-of-range working hours.
  const withDuration = hasPrior ? allWithDuration.slice(1) : allWithDuration;

  const metrics = computeMetrics(withDuration, tz);

  // Sprint-specific data
  const currentSprint = await first(
    db
      .select()
      .from(sprints)
      .where(
        and(eq(sprints.identityId, identityId), isNull(sprints.endDate))
      )
      .limit(1)
  );

  let goalChangeCount = 0;
  let priorityChangeCount = 0;
  let sprintGoals: string[] = [];

  if (currentSprint) {
    const goalSnapshots = await all(
      db
        .select()
        .from(sprintGoalSnapshots)
        .where(eq(sprintGoalSnapshots.sprintId, currentSprint.id))
    );
    goalChangeCount = Math.max(0, goalSnapshots.length - 1);

    const latestGoals = goalSnapshots.sort(
      (a, b) => b.timestamp.localeCompare(a.timestamp)
    )[0];
    if (latestGoals) {
      sprintGoals = JSON.parse(latestGoals.goals);
    }

    const prioritySnaps = await all(
      db
        .select()
        .from(prioritySnapshots)
        .where(eq(prioritySnapshots.sprintId, currentSprint.id))
    );
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
export async function computeExportData(
  identityId: number,
  from: string,
  to: string
) {
  const result = await computeReportData(identityId, from, to);
  if ("error" in result) return result;
  return { data: result.data, from, to };
}
