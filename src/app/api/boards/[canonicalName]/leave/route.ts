import { NextResponse } from "next/server";
import { db } from "@/db/index";
import { boards, boardMemberships } from "@/db/tables";
import { all, first, run } from "@/db/helpers";
import { eq, and } from "drizzle-orm";
import { withIdentity } from "@/lib/auth";

export const DELETE = withIdentity(
  async (
    _request: Request,
    identityId: number,
    { params }: { params: Promise<{ canonicalName: string }> }
  ) => {
    const { canonicalName } = await params;

    const board = await first(
      db
        .select({ id: boards.id })
        .from(boards)
        .where(eq(boards.nameCanonical, canonicalName))
    );

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    await run(
      db
        .delete(boardMemberships)
        .where(
          and(
            eq(boardMemberships.boardId, board.id),
            eq(boardMemberships.identityId, identityId)
          )
        )
    );

    const remaining = await all(
      db
        .select({ id: boardMemberships.id })
        .from(boardMemberships)
        .where(eq(boardMemberships.boardId, board.id))
    );

    if (remaining.length === 0) {
      await run(db.delete(boards).where(eq(boards.id, board.id)));
    }

    return NextResponse.json({ ok: true });
  }
);
