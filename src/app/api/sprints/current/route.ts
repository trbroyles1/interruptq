import { NextResponse } from "next/server";
import { db } from "@/db/index";
import { sprints } from "@/db/schema";
import { ensureDb } from "@/db/init";
import { and, eq, isNull } from "drizzle-orm";
import { withIdentity } from "@/lib/auth";

ensureDb();

export const GET = withIdentity(async (_request: Request, identityId: number) => {
  const current = db
    .select()
    .from(sprints)
    .where(and(eq(sprints.identityId, identityId), isNull(sprints.endDate)))
    .orderBy(sprints.ordinal)
    .limit(1)
    .get();

  if (!current) {
    return NextResponse.json({ error: "No active sprint" }, { status: 404 });
  }

  return NextResponse.json(current);
});
