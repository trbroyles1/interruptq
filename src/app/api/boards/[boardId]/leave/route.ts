import { NextResponse } from "next/server";
import { db } from "@/db/index";
import { boards, boardMemberships } from "@/db/tables";
import { all, run } from "@/db/helpers";
import { eq, and } from "drizzle-orm";
import { withIdentity } from "@/lib/auth";

export const DELETE = withIdentity(
  async (
    _request: Request,
    identityId: number,
    { params }: { params: Promise<{ boardId: string }> }
  ) => {
    const { boardId: boardIdStr } = await params;
    const boardId = Number.parseInt(boardIdStr, 10);

    if (Number.isNaN(boardId)) {
      return NextResponse.json({ error: "Invalid board ID" }, { status: 400 });
    }

    await run(
      db
        .delete(boardMemberships)
        .where(
          and(
            eq(boardMemberships.boardId, boardId),
            eq(boardMemberships.identityId, identityId)
          )
        )
    );

    const remaining = await all(
      db
        .select({ id: boardMemberships.id })
        .from(boardMemberships)
        .where(eq(boardMemberships.boardId, boardId))
    );

    if (remaining.length === 0) {
      await run(db.delete(boards).where(eq(boards.id, boardId)));
    }

    return NextResponse.json({ ok: true });
  }
);
