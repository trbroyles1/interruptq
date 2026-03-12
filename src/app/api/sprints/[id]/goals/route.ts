import { NextResponse } from "next/server";
import { db } from "@/db/index";
import { sprintGoalSnapshots, prioritySnapshots, sprints } from "@/db/schema";
import { ensureDb } from "@/db/init";
import { eq, and, desc } from "drizzle-orm";
import { withIdentity } from "@/lib/auth";
import type { PriorityItem } from "@/types";

ensureDb();

export const GET = withIdentity(
  async (
    _request: Request,
    identityId: number,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const { id } = await params;
    const sprintId = parseInt(id, 10);

    // Validate sprint ownership
    const sprint = db
      .select()
      .from(sprints)
      .where(and(eq(sprints.id, sprintId), eq(sprints.identityId, identityId)))
      .get();
    if (!sprint) {
      return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
    }

    const latest = db
      .select()
      .from(sprintGoalSnapshots)
      .where(eq(sprintGoalSnapshots.sprintId, sprintId))
      .orderBy(desc(sprintGoalSnapshots.timestamp))
      .limit(1)
      .get();

    if (!latest) {
      return NextResponse.json({ goals: [], snapshotCount: 0 });
    }

    const count = db
      .select()
      .from(sprintGoalSnapshots)
      .where(eq(sprintGoalSnapshots.sprintId, sprintId))
      .all().length;

    return NextResponse.json({
      ...latest,
      goals: JSON.parse(latest.goals),
      snapshotCount: count,
    });
  }
);

export const POST = withIdentity(
  async (
    request: Request,
    identityId: number,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const { id } = await params;
    const sprintId = parseInt(id, 10);

    // Validate sprint ownership
    const sprint = db
      .select()
      .from(sprints)
      .where(and(eq(sprints.id, sprintId), eq(sprints.identityId, identityId)))
      .get();
    if (!sprint) {
      return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
    }

    const body = await request.json();
    const goals: string[] = body.goals ?? [];
    const now = new Date().toISOString();

    // Create goal snapshot
    const goalSnapshot = db
      .insert(sprintGoalSnapshots)
      .values({
        identityId,
        sprintId,
        timestamp: now,
        goals: JSON.stringify(goals),
      })
      .returning()
      .get();

    // Overwrite priorities to match goals
    const priorities: PriorityItem[] = goals.map((g) => ({
      type: "ticket" as const,
      value: g,
    }));

    db.insert(prioritySnapshots)
      .values({
        identityId,
        sprintId,
        timestamp: now,
        priorities: JSON.stringify(priorities),
      })
      .run();

    return NextResponse.json({
      ...goalSnapshot,
      goals: JSON.parse(goalSnapshot.goals),
    });
  }
);
