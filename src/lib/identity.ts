import crypto from "crypto";
import { db } from "@/db/index";
import { identities } from "@/db/tables";
import { eq } from "drizzle-orm";
import { first, run } from "@/db/helpers";

const TOKEN_PREFIX = "iqt-";
const TOKEN_RANDOM_LENGTH = 32; // characters after prefix

/**
 * Generate a new user token: iqt-<32 random alphanumeric chars>
 */
export function generateToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.randomBytes(TOKEN_RANDOM_LENGTH);
  let result = TOKEN_PREFIX;
  for (let i = 0; i < TOKEN_RANDOM_LENGTH; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

/**
 * SHA-256 hash of the full token string (including iqt- prefix), returned as hex.
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Look up an identity by plaintext token.
 * Returns the identity record or null if not found.
 */
export async function resolveIdentity(token: string) {
  const hash = hashToken(token);
  return (
    (await first(
      db
        .select()
        .from(identities)
        .where(eq(identities.tokenHash, hash))
    )) ?? null
  );
}

// Throttle last_seen updates to once per minute per identity
const lastSeenCache = new Map<number, number>();
const LAST_SEEN_THROTTLE_MS = 60_000;

/**
 * Update the last_seen timestamp for an identity, throttled to once per minute.
 */
export async function updateLastSeen(identityId: number) {
  const now = Date.now();
  const last = lastSeenCache.get(identityId);
  if (last && now - last < LAST_SEEN_THROTTLE_MS) return;

  lastSeenCache.set(identityId, now);
  await run(
    db.update(identities)
      .set({ lastSeen: new Date().toISOString() })
      .where(eq(identities.id, identityId))
  );
}
