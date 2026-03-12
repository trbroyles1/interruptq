import { NextResponse } from "next/server";
import { db } from "@/db/index";
import { prioritySnapshots } from "@/db/schema";
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
    .from(prioritySnapshots)
    .where(eq(prioritySnapshots.sprintId, sprintId))
    .orderBy(desc(prioritySnapshots.timestamp))
    .limit(1)
    .get();

  if (!latest) {
    return NextResponse.json({ priorities: [], snapshotCount: 0 });
  }

  const count = db
    .select()
    .from(prioritySnapshots)
    .where(eq(prioritySnapshots.sprintId, sprintId))
    .all().length;

  return NextResponse.json({
    ...latest,
    priorities: JSON.parse(latest.priorities) as PriorityItem[],
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
  const priorities: PriorityItem[] = body.priorities ?? [];
  const now = new Date().toISOString();

  const snapshot = db
    .insert(prioritySnapshots)
    .values({
      sprintId,
      timestamp: now,
      priorities: JSON.stringify(priorities),
    })
    .returning()
    .get();

  return NextResponse.json({
    ...snapshot,
    priorities: JSON.parse(snapshot.priorities) as PriorityItem[],
  });
}
