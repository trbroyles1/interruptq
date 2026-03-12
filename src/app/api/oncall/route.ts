import { NextResponse } from "next/server";
import { db } from "@/db/index";
import { onCallChanges } from "@/db/schema";
import { ensureDb } from "@/db/init";
import { desc } from "drizzle-orm";

ensureDb();

export async function GET() {
  const latest = db
    .select()
    .from(onCallChanges)
    .orderBy(desc(onCallChanges.timestamp))
    .limit(1)
    .get();

  return NextResponse.json({
    isOnCall: latest?.status ?? false,
    lastChanged: latest?.timestamp ?? null,
  });
}

export async function POST() {
  const latest = db
    .select()
    .from(onCallChanges)
    .orderBy(desc(onCallChanges.timestamp))
    .limit(1)
    .get();

  const currentStatus = latest?.status ?? false;
  const newStatus = !currentStatus;
  const now = new Date().toISOString();

  db.insert(onCallChanges)
    .values({ timestamp: now, status: newStatus })
    .run();

  return NextResponse.json({
    isOnCall: newStatus,
    lastChanged: now,
  });
}
