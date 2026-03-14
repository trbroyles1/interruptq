import { NextResponse } from "next/server";
import { db } from "@/db/index";
import { boards, boardMemberships, identities } from "@/db/tables";
import { first, all, returningFirst } from "@/db/helpers";
import { eq, and } from "drizzle-orm";
import { withIdentity } from "@/lib/auth";
import {
  BOARD_NAME_PATTERN,
  MAX_BOARD_NAME_LENGTH,
  MAX_BOARDS_PER_USER,
} from "@/lib/board-constants";

export const POST = withIdentity(async (request: Request, identityId: number) => {
  const body = await request.json();
  const name: string | undefined = body.name;

  if (
    !name ||
    typeof name !== "string" ||
    name.length < 1 ||
    name.length > MAX_BOARD_NAME_LENGTH ||
    !BOARD_NAME_PATTERN.test(name)
  ) {
    return NextResponse.json(
      { error: "Invalid board name. Use 1-64 alphanumeric characters, hyphens, or underscores." },
      { status: 400 }
    );
  }

  const identity = await first(
    db
      .select({ handle: identities.handle })
      .from(identities)
      .where(eq(identities.id, identityId))
  );

  if (!identity?.handle) {
    return NextResponse.json(
      { error: "You must set a handle before joining a board." },
      { status: 403 }
    );
  }

  const existingMemberships = await all(
    db
      .select({ id: boardMemberships.id })
      .from(boardMemberships)
      .where(eq(boardMemberships.identityId, identityId))
  );

  if (existingMemberships.length >= MAX_BOARDS_PER_USER) {
    return NextResponse.json(
      { error: `You may join at most ${MAX_BOARDS_PER_USER} boards.` },
      { status: 409 }
    );
  }

  const canonical = name.toLowerCase();

  let board = await first(
    db
      .select()
      .from(boards)
      .where(eq(boards.nameCanonical, canonical))
  );

  if (!board) {
    board = await returningFirst(
      db
        .insert(boards)
        .values({ nameCanonical: canonical, nameDisplay: name })
        .returning()
    );
  }

  const existingMembership = await first(
    db
      .select()
      .from(boardMemberships)
      .where(
        and(
          eq(boardMemberships.boardId, board.id),
          eq(boardMemberships.identityId, identityId)
        )
      )
  );

  if (existingMembership) {
    return NextResponse.json({
      board: { nameCanonical: board.nameCanonical, nameDisplay: board.nameDisplay },
      membership: existingMembership,
    });
  }

  const membership = await returningFirst(
    db
      .insert(boardMemberships)
      .values({ boardId: board.id, identityId })
      .returning()
  );

  return NextResponse.json({
    board: { nameCanonical: board.nameCanonical, nameDisplay: board.nameDisplay },
    membership,
  });
});
