import { NextResponse } from "next/server";
import { db } from "@/db/index";
import { boards } from "@/db/tables";
import { first } from "@/db/helpers";
import { eq } from "drizzle-orm";
import { computeBoardViewData } from "@/lib/board-metrics";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ canonicalName: string }> }
) {
  const { canonicalName } = await params;
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!from || !to) {
    return NextResponse.json(
      { error: "from and to query params required" },
      { status: 400 }
    );
  }

  const board = await first(
    db
      .select()
      .from(boards)
      .where(eq(boards.nameCanonical, canonicalName))
  );

  if (!board) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  const { participants, aggregates } = await computeBoardViewData(
    board.id,
    from,
    to
  );

  return NextResponse.json({ participants, aggregates });
}
