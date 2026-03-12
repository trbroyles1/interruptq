import crypto from "crypto";
import { db } from "@/db/index";
import { shareLinks } from "@/db/tables";
import { eq, and, isNull, gt } from "drizzle-orm";
import { first } from "@/db/helpers";

const SHARE_ID_LENGTH = 32;

/**
 * Generate a random share ID (32 alphanumeric characters).
 */
export function generateShareId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.randomBytes(SHARE_ID_LENGTH);
  let result = "";
  for (let i = 0; i < SHARE_ID_LENGTH; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

/**
 * Resolve the base URL for share links.
 * Uses INTERRUPTQ_BASE_URL env var if set, otherwise auto-detects from request.
 */
export function resolveBaseUrl(request: Request): string {
  const envBaseUrl = process.env.INTERRUPTQ_BASE_URL;
  if (envBaseUrl) {
    return envBaseUrl.replace(/\/$/, "");
  }

  const host = request.headers.get("host") || "localhost:3099";
  const proto = request.headers.get("x-forwarded-proto") || "http";
  return `${proto}://${host}`;
}

/**
 * Validate a share link by share ID. Returns the share link record if active, null otherwise.
 */
export async function validateShareLink(shareId: string) {
  const now = new Date().toISOString();
  const link = await first(
    db
      .select()
      .from(shareLinks)
      .where(
        and(
          eq(shareLinks.shareId, shareId),
          isNull(shareLinks.revokedAt),
          gt(shareLinks.expiresAt, now)
        )
      )
  );
  return link ?? null;
}
