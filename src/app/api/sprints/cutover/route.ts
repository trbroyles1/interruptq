import { NextResponse } from "next/server";
import { db } from "@/db/index";
import { sprints } from "@/db/schema";
import { ensureDb } from "@/db/init";
import { and, eq, isNull, desc } from "drizzle-orm";
import { withIdentity } from "@/lib/auth";

ensureDb();

export const POST = withIdentity(async (request: Request, identityId: number) => {
  const body = await request.json().catch(() => ({}));
  const cutoverDate = body.date || new Date().toISOString().split("T")[0];

  // End the current sprint
  const current = db
    .select()
    .from(sprints)
    .where(and(eq(sprints.identityId, identityId), isNull(sprints.endDate)))
    .get();

  if (current) {
    db.update(sprints)
      .set({ endDate: cutoverDate })
      .where(and(eq(sprints.identityId, identityId), isNull(sprints.endDate)))
      .run();
  }

  // Get the highest ordinal for this identity
  const last = db
    .select()
    .from(sprints)
    .where(eq(sprints.identityId, identityId))
    .orderBy(desc(sprints.ordinal))
    .limit(1)
    .get();

  const nextOrdinal = (last?.ordinal ?? 0) + 1;

  // Create a new sprint
  const result = db
    .insert(sprints)
    .values({ identityId, ordinal: nextOrdinal, startDate: cutoverDate })
    .returning()
    .get();

  return NextResponse.json(result);
});
