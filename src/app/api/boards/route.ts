import { NextResponse } from "next/server";
import { db } from "@/db/index";
import { boards, boardMemberships } from "@/db/tables";
import { all } from "@/db/helpers";
import { sql, like } from "drizzle-orm";

const MAX_BOARD_LIST_RESULTS = 50;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  const query = db
    .select({
      nameCanonical: boards.nameCanonical,
      nameDisplay: boards.nameDisplay,
      participantCount: sql<number>`count(${boardMemberships.id})`,
    })
    .from(boards)
    .leftJoin(boardMemberships, sql`${boards.id} = ${boardMemberships.boardId}`)
    .groupBy(boards.id, boards.nameCanonical, boards.nameDisplay)
    .orderBy(boards.nameCanonical)
    .limit(MAX_BOARD_LIST_RESULTS);

  if (q) {
    query.where(like(boards.nameCanonical, `%${q.toLowerCase()}%`));
  }

  const rows = await all(query);
  return NextResponse.json(rows);
}
