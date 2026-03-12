import { NextResponse } from "next/server";
import { db } from "@/db/index";
import { knownTags } from "@/db/schema";
import { ensureDb } from "@/db/init";
import { and, eq, like } from "drizzle-orm";
import { withIdentity } from "@/lib/auth";

ensureDb();

export const GET = withIdentity(async (request: Request, identityId: number) => {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  let results;
  if (q) {
    results = db
      .select()
      .from(knownTags)
      .where(
        and(
          eq(knownTags.identityId, identityId),
          like(knownTags.name, `%${q}%`)
        )
      )
      .orderBy(knownTags.name)
      .limit(20)
      .all();
  } else {
    results = db
      .select()
      .from(knownTags)
      .where(eq(knownTags.identityId, identityId))
      .orderBy(knownTags.name)
      .all();
  }

  return NextResponse.json(results.map((r) => r.name));
});

export const POST = withIdentity(async (request: Request, identityId: number) => {
  const body = await request.json();
  const name: string = body.name?.trim();

  if (!name) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }

  db.insert(knownTags)
    .values({ identityId, name })
    .onConflictDoNothing()
    .run();

  return NextResponse.json({ name });
});
