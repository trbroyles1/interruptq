import { NextResponse } from "next/server";
import { db } from "@/db/index";
import { sprints } from "@/db/tables";
import { ensureDb } from "@/db/init";
import { and, eq, isNull, desc } from "drizzle-orm";
import { withIdentity } from "@/lib/auth";
import { first, run, returningFirst } from "@/db/helpers";

export const POST = withIdentity(async (request: Request, identityId: number) => {
  await ensureDb();
  const body = await request.json().catch(() => ({}));
  const cutoverDate = body.date || new Date().toISOString().split("T")[0];

  // End the current sprint
  const current = await first(
    db
      .select()
      .from(sprints)
      .where(and(eq(sprints.identityId, identityId), isNull(sprints.endDate)))
  );

  if (current) {
    await run(
      db.update(sprints)
        .set({ endDate: cutoverDate })
        .where(and(eq(sprints.identityId, identityId), isNull(sprints.endDate)))
    );
  }

  // Get the highest ordinal for this identity
  const last = await first(
    db
      .select()
      .from(sprints)
      .where(eq(sprints.identityId, identityId))
      .orderBy(desc(sprints.ordinal))
      .limit(1)
  );

  const nextOrdinal = (last?.ordinal ?? 0) + 1;

  // Create a new sprint
  const result = await returningFirst(
    db
      .insert(sprints)
      .values({ identityId, ordinal: nextOrdinal, startDate: cutoverDate })
      .returning()
  );

  return NextResponse.json(result);
});
