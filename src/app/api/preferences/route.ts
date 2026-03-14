import { NextResponse } from "next/server";
import { db } from "@/db/index";
import { preferences } from "@/db/tables";
import { eq } from "drizzle-orm";
import { withIdentity } from "@/lib/auth";
import { first, run } from "@/db/helpers";
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
  return NextResponse.json({
    ...row,
    workingHours: JSON.parse(row.workingHours) as WorkingHours,
  });
});

export const PUT = withIdentity(async (request: Request, identityId: number) => {

  const body = await request.json();
  const updates: Record<string, unknown> = {};

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

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  await run(
    db.update(preferences)
      .set(updates)
      .where(eq(preferences.identityId, identityId))
  );

  const row = await first(
    db
      .select()
      .from(preferences)
      .where(eq(preferences.identityId, identityId))
  );
  return NextResponse.json({
    ...row,
    workingHours: JSON.parse(row!.workingHours) as WorkingHours,
  });
});
