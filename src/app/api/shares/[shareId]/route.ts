import { NextResponse } from "next/server";
import { db } from "@/db/index";
import { shareLinks } from "@/db/tables";
import { eq, and } from "drizzle-orm";
import { withIdentity } from "@/lib/auth";
import { first, run } from "@/db/helpers";

export const DELETE = withIdentity(
  async (
    _request: Request,
    identityId: number,
    { params }: { params: Promise<{ shareId: string }> }
  ) => {
    const { shareId } = await params;

    // Find the share link and verify ownership
    const link = await first(
      db
        .select()
        .from(shareLinks)
        .where(
          and(
            eq(shareLinks.shareId, shareId),
            eq(shareLinks.identityId, identityId)
          )
        )
    );

    if (!link) {
      return NextResponse.json({ error: "Share link not found" }, { status: 404 });
    }

    const now = new Date().toISOString();
    await run(
      db.update(shareLinks)
        .set({ revokedAt: now })
        .where(eq(shareLinks.id, link.id))
    );

    return NextResponse.json({ revoked: true });
  }
);
