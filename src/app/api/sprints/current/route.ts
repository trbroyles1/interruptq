import { NextResponse } from "next/server";
import { db } from "@/db/index";
import { sprints } from "@/db/schema";
import { ensureDb } from "@/db/init";
import { isNull } from "drizzle-orm";

ensureDb();

export async function GET() {
  const current = db
    .select()
    .from(sprints)
    .where(isNull(sprints.endDate))
    .orderBy(sprints.ordinal)
    .limit(1)
    .get();

  if (!current) {
    return NextResponse.json({ error: "No active sprint" }, { status: 404 });
  }

  return NextResponse.json(current);
}
