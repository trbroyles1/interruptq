import { NextResponse } from "next/server";
import { db } from "@/db/index";
import { onCallChanges } from "@/db/tables";
import { ensureDb } from "@/db/init";
import { eq, desc } from "drizzle-orm";
import { withIdentity } from "@/lib/auth";
import { first, run } from "@/db/helpers";

export const GET = withIdentity(async (_request: Request, identityId: number) => {
  await ensureDb();
  const latest = await first(
    db
      .select()
      .from(onCallChanges)
      .where(eq(onCallChanges.identityId, identityId))
      .orderBy(desc(onCallChanges.timestamp))
      .limit(1)
  );

  return NextResponse.json({
    isOnCall: latest?.status ?? false,
    lastChanged: latest?.timestamp ?? null,
  });
});

export const POST = withIdentity(async (_request: Request, identityId: number) => {
  await ensureDb();
  const latest = await first(
    db
      .select()
      .from(onCallChanges)
      .where(eq(onCallChanges.identityId, identityId))
      .orderBy(desc(onCallChanges.timestamp))
      .limit(1)
  );

  const currentStatus = latest?.status ?? false;
  const newStatus = !currentStatus;
  const now = new Date().toISOString();

  await run(
    db.insert(onCallChanges)
      .values({ identityId, timestamp: now, status: newStatus })
  );

  return NextResponse.json({
    isOnCall: newStatus,
    lastChanged: now,
  });
});
