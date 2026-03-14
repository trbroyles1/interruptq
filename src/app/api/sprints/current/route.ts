import { NextResponse } from "next/server";
import { db } from "@/db/index";
import { sprints } from "@/db/tables";
import { and, eq, isNull } from "drizzle-orm";
import { withIdentity } from "@/lib/auth";
import { first } from "@/db/helpers";

export const GET = withIdentity(async (_request: Request, identityId: number) => {
  const current = await first(
    db
      .select()
      .from(sprints)
      .where(and(eq(sprints.identityId, identityId), isNull(sprints.endDate)))
      .orderBy(sprints.ordinal)
      .limit(1)
  );

  if (!current) {
    return NextResponse.json({ error: "No active sprint" }, { status: 404 });
  }

  return NextResponse.json(current);
});
