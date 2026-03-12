import { NextResponse } from "next/server";
import { db } from "@/db/index";
import { sprintGoalSnapshots, prioritySnapshots, sprints } from "@/db/tables";
import { ensureDb } from "@/db/init";
import { eq, and, desc } from "drizzle-orm";
import { withIdentity } from "@/lib/auth";
import { first, all, run, returningFirst } from "@/db/helpers";
import type { PriorityItem } from "@/types";

export const GET = withIdentity(
  async (
    _request: Request,
    identityId: number,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    await ensureDb();
    const { id } = await params;
    const sprintId = parseInt(id, 10);

    // Validate sprint ownership
    const sprint = await first(
      db
        .select()
        .from(sprints)
        .where(and(eq(sprints.id, sprintId), eq(sprints.identityId, identityId)))
    );
    if (!sprint) {
      return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
    }

    const latest = await first(
      db
        .select()
        .from(sprintGoalSnapshots)
        .where(eq(sprintGoalSnapshots.sprintId, sprintId))
        .orderBy(desc(sprintGoalSnapshots.timestamp))
        .limit(1)
    );

    if (!latest) {
      return NextResponse.json({ goals: [], snapshotCount: 0 });
    }

    const rows = await all(
      db
        .select()
        .from(sprintGoalSnapshots)
        .where(eq(sprintGoalSnapshots.sprintId, sprintId))
    );
    const count = rows.length;

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
    await ensureDb();
    const { id } = await params;
    const sprintId = parseInt(id, 10);

    // Validate sprint ownership
    const sprint = await first(
      db
        .select()
        .from(sprints)
        .where(and(eq(sprints.id, sprintId), eq(sprints.identityId, identityId)))
    );
    if (!sprint) {
      return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
    }

    const body = await request.json();
    const goals: string[] = body.goals ?? [];
    const now = new Date().toISOString();

    // Create goal snapshot
    const goalSnapshot = await returningFirst(
      db
        .insert(sprintGoalSnapshots)
        .values({
          identityId,
          sprintId,
          timestamp: now,
          goals: JSON.stringify(goals),
        })
        .returning()
    );

    // Overwrite priorities to match goals
    const priorities: PriorityItem[] = goals.map((g) => ({
      type: "ticket" as const,
      value: g,
    }));

    await run(
      db.insert(prioritySnapshots)
        .values({
          identityId,
          sprintId,
          timestamp: now,
          priorities: JSON.stringify(priorities),
        })
    );

    return NextResponse.json({
      ...goalSnapshot,
      goals: JSON.parse(goalSnapshot.goals),
    });
  }
);
