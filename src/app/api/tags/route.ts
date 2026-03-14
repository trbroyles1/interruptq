import { NextResponse } from "next/server";
import { db } from "@/db/index";
import { knownTags } from "@/db/tables";
import { and, eq, like } from "drizzle-orm";
import { withIdentity } from "@/lib/auth";
import { all, run } from "@/db/helpers";

export const GET = withIdentity(async (request: Request, identityId: number) => {

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  let results;
  if (q) {
    results = await all(
      db
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
    );
  } else {
    results = await all(
      db
        .select()
        .from(knownTags)
        .where(eq(knownTags.identityId, identityId))
        .orderBy(knownTags.name)
    );
  }

  return NextResponse.json(results.map((r) => r.name));
});

export const POST = withIdentity(async (request: Request, identityId: number) => {

  const body = await request.json();
  const name: string = body.name?.trim();

  if (!name) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }

  await run(
    db.insert(knownTags)
      .values({ identityId, name })
      .onConflictDoNothing()
  );

  return NextResponse.json({ name });
});
