import { NextResponse } from "next/server";
import { db } from "@/db/index";
import { prioritySnapshots, sprints } from "@/db/tables";
import { ensureDb } from "@/db/init";
import { eq, and, desc } from "drizzle-orm";
import { withIdentity } from "@/lib/auth";
import { first, all, returningFirst } from "@/db/helpers";
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
        .from(prioritySnapshots)
        .where(eq(prioritySnapshots.sprintId, sprintId))
        .orderBy(desc(prioritySnapshots.timestamp))
        .limit(1)
    );

    if (!latest) {
      return NextResponse.json({ priorities: [], snapshotCount: 0 });
    }

    const rows = await all(
      db
        .select()
        .from(prioritySnapshots)
        .where(eq(prioritySnapshots.sprintId, sprintId))
    );
    const count = rows.length;

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
    const priorities: PriorityItem[] = body.priorities ?? [];
    const now = new Date().toISOString();

    const snapshot = await returningFirst(
      db
        .insert(prioritySnapshots)
        .values({
          identityId,
          sprintId,
          timestamp: now,
          priorities: JSON.stringify(priorities),
        })
        .returning()
    );

    return NextResponse.json({
      ...snapshot,
      priorities: JSON.parse(snapshot.priorities) as PriorityItem[],
    });
  }
);
