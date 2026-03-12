import { NextResponse } from "next/server";
import { db } from "@/db/index";
import { onCallChanges } from "@/db/schema";
import { ensureDb } from "@/db/init";
import { eq, desc } from "drizzle-orm";
import { withIdentity } from "@/lib/auth";

ensureDb();

export const GET = withIdentity(async (_request: Request, identityId: number) => {
  const latest = db
    .select()
    .from(onCallChanges)
    .where(eq(onCallChanges.identityId, identityId))
    .orderBy(desc(onCallChanges.timestamp))
    .limit(1)
    .get();

  return NextResponse.json({
    isOnCall: latest?.status ?? false,
    lastChanged: latest?.timestamp ?? null,
  });
});

export const POST = withIdentity(async (_request: Request, identityId: number) => {
  const latest = db
    .select()
    .from(onCallChanges)
    .where(eq(onCallChanges.identityId, identityId))
    .orderBy(desc(onCallChanges.timestamp))
    .limit(1)
    .get();

  const currentStatus = latest?.status ?? false;
  const newStatus = !currentStatus;
  const now = new Date().toISOString();

  db.insert(onCallChanges)
    .values({ identityId, timestamp: now, status: newStatus })
    .run();

  return NextResponse.json({
    isOnCall: newStatus,
    lastChanged: now,
  });
});
