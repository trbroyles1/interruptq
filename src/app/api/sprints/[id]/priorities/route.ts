import { NextResponse } from "next/server";
import { db } from "@/db/index";
import { prioritySnapshots, sprints } from "@/db/schema";
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
    const priorities: PriorityItem[] = body.priorities ?? [];
    const now = new Date().toISOString();

    const snapshot = db
      .insert(prioritySnapshots)
      .values({
        identityId,
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
);
