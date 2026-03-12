import { NextResponse } from "next/server";
import { db } from "@/db/index";
import { sprintGoalSnapshots, prioritySnapshots } from "@/db/schema";
import { ensureDb } from "@/db/init";
import { eq, desc } from "drizzle-orm";
import type { PriorityItem } from "@/types";

ensureDb();

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sprintId = parseInt(id, 10);

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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sprintId = parseInt(id, 10);
  const body = await request.json();
  const goals: string[] = body.goals ?? [];
  const now = new Date().toISOString();

  // Create goal snapshot
  const goalSnapshot = db
    .insert(sprintGoalSnapshots)
    .values({
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
