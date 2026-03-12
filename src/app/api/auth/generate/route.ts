import { NextResponse } from "next/server";
import { db } from "@/db/index";
import { identities } from "@/db/schema";
import { ensureDb } from "@/db/init";
import { generateToken, hashToken } from "@/lib/identity";
import { setCookieHeader, isSecureRequest } from "@/lib/auth";
import { seedIdentityDefaults } from "@/db/seed";

ensureDb();

export async function POST(request: Request) {
  const token = generateToken();
  const tokenHash = hashToken(token);

  // Create the identity
  const identity = db
    .insert(identities)
    .values({ tokenHash })
    .returning()
    .get();

  // Seed default preferences and first sprint
  seedIdentityDefaults(identity.id);

  // Set the token cookie
  const response = NextResponse.json({ token });
  response.headers.set(
    "Set-Cookie",
    setCookieHeader(token, isSecureRequest(request))
  );
  return response;
}
