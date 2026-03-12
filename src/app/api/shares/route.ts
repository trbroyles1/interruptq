import { NextResponse } from "next/server";
import { db } from "@/db/index";
import { shareLinks } from "@/db/schema";
import { ensureDb } from "@/db/init";
import { eq, and, isNull, gt } from "drizzle-orm";
import { withIdentity } from "@/lib/auth";
import { generateShareId, resolveBaseUrl } from "@/lib/share";

ensureDb();

const MAX_ACTIVE_LINKS = 5;

export const GET = withIdentity(async (_request: Request, identityId: number) => {
  const now = new Date().toISOString();
  const links = db
    .select()
    .from(shareLinks)
    .where(
      and(
        eq(shareLinks.identityId, identityId),
        isNull(shareLinks.revokedAt),
        gt(shareLinks.expiresAt, now)
      )
    )
    .all();

  return NextResponse.json(links);
});

export const POST = withIdentity(async (request: Request, identityId: number) => {
  const now = new Date().toISOString();

  // Count active links
  const activeLinks = db
    .select()
    .from(shareLinks)
    .where(
      and(
        eq(shareLinks.identityId, identityId),
        isNull(shareLinks.revokedAt),
        gt(shareLinks.expiresAt, now)
      )
    )
    .all();

  if (activeLinks.length >= MAX_ACTIVE_LINKS) {
    return NextResponse.json(
      {
        error: `Maximum ${MAX_ACTIVE_LINKS} active share links. Revoke an existing link first.`,
      },
      { status: 409 }
    );
  }

  const shareId = generateShareId();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const link = db
    .insert(shareLinks)
    .values({
      identityId,
      shareId,
      expiresAt,
    })
    .returning()
    .get();

  const baseUrl = resolveBaseUrl(request);
  const url = `${baseUrl}/share/${shareId}`;

  return NextResponse.json({ ...link, url });
});
