import { NextResponse } from "next/server";
import { resolveIdentity, updateLastSeen } from "./identity";

export const COOKIE_NAME = "iqt_token";
const TEN_YEARS_SECONDS = 10 * 365 * 24 * 60 * 60;

/**
 * Build the Set-Cookie header value for the token cookie.
 */
export function setCookieHeader(token: string, secure: boolean = false): string {
  const parts = [
    `${COOKIE_NAME}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${TEN_YEARS_SECONDS}`,
  ];
  if (secure) {
    parts.push("Secure");
  }
  return parts.join("; ");
}

/**
 * Build a Set-Cookie header that clears the token cookie.
 */
export function clearCookieHeader(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

/**
 * Extract the token from the request's cookie header.
 */
function getTokenFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;

  for (const part of cookieHeader.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === COOKIE_NAME) {
      return rest.join("=");
    }
  }
  return null;
}

/**
 * Resolve the identity from a request's cookie.
 * Returns { identityId } or null if not authenticated.
 */
export async function getIdentityFromRequest(request: Request): Promise<{ identityId: number } | null> {
  const token = getTokenFromRequest(request);
  if (!token) return null;

  const identity = await resolveIdentity(token);
  if (!identity) return null;

  return { identityId: identity.id };
}

/**
 * Determine if the request is using HTTPS (for Secure cookie flag).
 */
export function isSecureRequest(request: Request): boolean {
  const proto = request.headers.get("x-forwarded-proto");
  if (proto) return proto === "https";
  try {
    return new URL(request.url).protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Higher-order function wrapping Next.js route handlers with identity auth.
 * Returns 401 if no valid identity. Passes identityId as second arg.
 */
export function withIdentity<T extends unknown[]>(
  handler: (request: Request, identityId: number, ...args: T) => Promise<Response>
) {
  return async (request: Request, ...args: T): Promise<Response> => {
    const identity = await getIdentityFromRequest(request);
    if (!identity) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await updateLastSeen(identity.identityId);
    return handler(request, identity.identityId, ...args);
  };
}
