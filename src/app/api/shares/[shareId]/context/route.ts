import { NextResponse } from "next/server";
import { db } from "@/db/index";
import {
  sprints,
  sprintGoalSnapshots,
  prioritySnapshots,
  onCallChanges,
  preferences,
} from "@/db/tables";
import { eq, and, isNull, desc } from "drizzle-orm";
import { validateShareLink } from "@/lib/share";
import { first } from "@/db/helpers";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ shareId: string }> }
) {
  const { shareId } = await params;

  const link = await validateShareLink(shareId);
  if (!link) {
    return NextResponse.json(
      { error: "Share link expired or invalid" },
      { status: 404 }
    );
  }

  const identityId = link.identityId;

  // Current sprint
  const sprint = await first(
    db
      .select()
      .from(sprints)
      .where(and(eq(sprints.identityId, identityId), isNull(sprints.endDate)))
      .limit(1)
  );

  // Sprint goals
  let goals: string[] = [];
  if (sprint) {
    const latest = await first(
      db
        .select()
        .from(sprintGoalSnapshots)
        .where(eq(sprintGoalSnapshots.sprintId, sprint.id))
        .orderBy(desc(sprintGoalSnapshots.timestamp))
        .limit(1)
    );
    if (latest) {
      goals = JSON.parse(latest.goals);
    }
  }

  // Priorities
  let priorities: unknown[] = [];
  if (sprint) {
    const latest = await first(
      db
        .select()
        .from(prioritySnapshots)
        .where(eq(prioritySnapshots.sprintId, sprint.id))
        .orderBy(desc(prioritySnapshots.timestamp))
        .limit(1)
    );
    if (latest) {
      priorities = JSON.parse(latest.priorities);
    }
  }

  // On-call status
  const latestOnCall = await first(
    db
      .select()
      .from(onCallChanges)
      .where(eq(onCallChanges.identityId, identityId))
      .orderBy(desc(onCallChanges.timestamp))
      .limit(1)
  );

  // Owner's timezone
  const prefs = await first(
    db
      .select()
      .from(preferences)
      .where(eq(preferences.identityId, identityId))
  );
  const timezone = prefs?.timezone ?? "America/New_York";
  const weekStartDay = prefs?.weekStartDay ?? 1;

  return NextResponse.json({
    sprint: sprint ?? null,
    goals,
    priorities,
    isOnCall: latestOnCall?.status ?? false,
    expiresAt: link.expiresAt,
    timezone,
    weekStartDay,
  });
}
