import { NextResponse } from "next/server";
import { db } from "@/db/index";
import { knownTags } from "@/db/schema";
import { ensureDb } from "@/db/init";
import { like } from "drizzle-orm";

ensureDb();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  let results;
  if (q) {
    results = db
      .select()
      .from(knownTags)
      .where(like(knownTags.name, `%${q}%`))
      .orderBy(knownTags.name)
      .limit(20)
      .all();
  } else {
    results = db
      .select()
      .from(knownTags)
      .orderBy(knownTags.name)
      .all();
  }

  return NextResponse.json(results.map((r) => r.name));
}

export async function POST(request: Request) {
  const body = await request.json();
  const name: string = body.name?.trim();

  if (!name) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }

  // Upsert — ignore if already exists
  db.insert(knownTags)
    .values({ name })
    .onConflictDoNothing()
    .run();

  return NextResponse.json({ name });
}
