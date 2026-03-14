import { NextResponse } from "next/server";
import { db } from "@/db/index";
import { identities } from "@/db/tables";
import { generateToken, hashToken } from "@/lib/identity";
import { setCookieHeader, isSecureRequest } from "@/lib/auth";
import { seedIdentityDefaults } from "@/db/seed";
import { returningFirst } from "@/db/helpers";

export async function POST(request: Request) {
  const token = generateToken();
  const tokenHash = hashToken(token);

  // Create the identity
  const identity = await returningFirst(
    db
      .insert(identities)
      .values({ tokenHash })
      .returning()
  );

  // Seed default preferences and first sprint
  await seedIdentityDefaults(identity.id);

  // Set the token cookie
  const response = NextResponse.json({ token });
  response.headers.set(
    "Set-Cookie",
    setCookieHeader(token, isSecureRequest(request))
  );
  return response;
}
