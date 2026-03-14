import { NextResponse } from "next/server";
import { db } from "@/db/index";
import { boards, boardMemberships } from "@/db/tables";
import { all } from "@/db/helpers";
import { eq, sql } from "drizzle-orm";
import { withIdentity } from "@/lib/auth";

export const GET = withIdentity(async (_request: Request, identityId: number) => {
  const rows = await all(
    db
      .select({
        id: boardMemberships.id,
        boardId: boardMemberships.boardId,
        boardNameCanonical: boards.nameCanonical,
        boardNameDisplay: boards.nameDisplay,
        joinedAt: boardMemberships.joinedAt,
      })
      .from(boardMemberships)
      .innerJoin(boards, sql`${boardMemberships.boardId} = ${boards.id}`)
      .where(eq(boardMemberships.identityId, identityId))
  );

  return NextResponse.json(rows);
});
