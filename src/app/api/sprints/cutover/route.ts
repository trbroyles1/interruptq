import { NextResponse } from "next/server";
import { db } from "@/db/index";
import { sprints } from "@/db/schema";
import { ensureDb } from "@/db/init";
import { isNull, desc } from "drizzle-orm";

ensureDb();

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const cutoverDate = body.date || new Date().toISOString().split("T")[0];

  // End the current sprint
  const current = db
    .select()
    .from(sprints)
    .where(isNull(sprints.endDate))
    .get();

  if (current) {
    db.update(sprints)
      .set({ endDate: cutoverDate })
      .where(isNull(sprints.endDate))
      .run();
  }

  // Get the highest ordinal
  const last = db
    .select()
    .from(sprints)
    .orderBy(desc(sprints.ordinal))
    .limit(1)
    .get();

  const nextOrdinal = (last?.ordinal ?? 0) + 1;

  // Create a new sprint
  const result = db
    .insert(sprints)
    .values({ ordinal: nextOrdinal, startDate: cutoverDate })
    .returning()
    .get();

  return NextResponse.json(result);
}
