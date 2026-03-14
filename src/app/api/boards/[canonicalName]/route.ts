import { NextResponse } from "next/server";
import { db } from "@/db/index";
import { boards, boardMemberships, identities } from "@/db/tables";
import { first, all } from "@/db/helpers";
import { eq, sql } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ canonicalName: string }> }
) {
  const { canonicalName } = await params;

  const board = await first(
    db
      .select()
      .from(boards)
      .where(eq(boards.nameCanonical, canonicalName))
  );

  if (!board) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  const members = await all(
    db
      .select({
        handle: identities.handle,
        identityId: boardMemberships.identityId,
      })
      .from(boardMemberships)
      .innerJoin(identities, sql`${boardMemberships.identityId} = ${identities.id}`)
      .where(eq(boardMemberships.boardId, board.id))
  );

  return NextResponse.json({
    nameCanonical: board.nameCanonical,
    nameDisplay: board.nameDisplay,
    participantCount: members.length,
    participants: members.map((m) => ({
      handle: m.handle ?? "",
      identityId: m.identityId,
    })),
  });
}
