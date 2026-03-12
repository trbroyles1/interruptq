import { NextResponse } from "next/server";
import { db } from "@/db/index";
import { shareLinks } from "@/db/schema";
import { ensureDb } from "@/db/init";
import { eq, and } from "drizzle-orm";
import { withIdentity } from "@/lib/auth";

ensureDb();

export const DELETE = withIdentity(
  async (
    _request: Request,
    identityId: number,
    { params }: { params: Promise<{ shareId: string }> }
  ) => {
    const { shareId } = await params;

    // Find the share link and verify ownership
    const link = db
      .select()
      .from(shareLinks)
      .where(
        and(
          eq(shareLinks.shareId, shareId),
          eq(shareLinks.identityId, identityId)
        )
      )
      .get();

    if (!link) {
      return NextResponse.json({ error: "Share link not found" }, { status: 404 });
    }

    const now = new Date().toISOString();
    db.update(shareLinks)
      .set({ revokedAt: now })
      .where(eq(shareLinks.id, link.id))
      .run();

    return NextResponse.json({ revoked: true });
  }
);
