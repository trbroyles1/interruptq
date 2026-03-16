import { NextResponse } from "next/server";
import { db } from "@/db/index";
import { preferences, identities } from "@/db/tables";
import { eq } from "drizzle-orm";
import { withIdentity } from "@/lib/auth";
import { first, run } from "@/db/helpers";
import { MAX_HANDLE_LENGTH } from "@/lib/board-constants";
import type { WorkingHours } from "@/types";

export const GET = withIdentity(async (_request: Request, identityId: number) => {

  const row = await first(
    db
      .select()
      .from(preferences)
      .where(eq(preferences.identityId, identityId))
  );
  if (!row) {
    return NextResponse.json({ error: "No preferences found" }, { status: 404 });
  }

  const identity = await first(
    db
      .select({ handle: identities.handle })
      .from(identities)
      .where(eq(identities.id, identityId))
  );

  return NextResponse.json({
    ...row,
    workingHours: JSON.parse(row.workingHours) as WorkingHours,
    handle: identity?.handle ?? null,
  });
});

export const PUT = withIdentity(async (request: Request, identityId: number) => {

  const body = await request.json();
  const updates: Record<string, unknown> = {};
  let handleUpdated = false;

  if (body.workingHours !== undefined) {
    updates.workingHours = JSON.stringify(body.workingHours);
  }
  if (body.onCallPrefix !== undefined) {
    updates.onCallPrefix = body.onCallPrefix;
  }
  if (body.quickPickRecentCount !== undefined) {
    updates.quickPickRecentCount = body.quickPickRecentCount;
  }
  if (body.quickPickOncallTicketCount !== undefined) {
    updates.quickPickOncallTicketCount = body.quickPickOncallTicketCount;
  }
  if (body.quickPickOncallOtherCount !== undefined) {
    updates.quickPickOncallOtherCount = body.quickPickOncallOtherCount;
  }
  if (body.weekStartDay !== undefined) {
    updates.weekStartDay = body.weekStartDay;
  }
  if (body.timezone !== undefined) {
    updates.timezone = body.timezone;
  }
  if (body.tourCompleted !== undefined) {
    updates.tourCompleted = body.tourCompleted;
  }

  if (body.handle !== undefined) {
    const handle =
      typeof body.handle === "string" && body.handle.length > 0
        ? body.handle.slice(0, MAX_HANDLE_LENGTH)
        : null;
    await run(
      db
        .update(identities)
        .set({ handle })
        .where(eq(identities.id, identityId))
    );
    handleUpdated = true;
  }

  if (Object.keys(updates).length === 0 && !handleUpdated) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  if (Object.keys(updates).length > 0) {
    await run(
      db.update(preferences)
        .set(updates)
        .where(eq(preferences.identityId, identityId))
    );
  }

  const row = await first(
    db
      .select()
      .from(preferences)
      .where(eq(preferences.identityId, identityId))
  );

  const identity = await first(
    db
      .select({ handle: identities.handle })
      .from(identities)
      .where(eq(identities.id, identityId))
  );

  return NextResponse.json({
    ...row,
    workingHours: JSON.parse(row!.workingHours) as WorkingHours,
    handle: identity?.handle ?? null,
  });
});
