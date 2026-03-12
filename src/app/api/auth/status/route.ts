import { NextResponse } from "next/server";
import { ensureDb } from "@/db/init";
import { getIdentityFromRequest } from "@/lib/auth";

export async function GET(request: Request) {
  await ensureDb();
  const identity = await getIdentityFromRequest(request);
  if (identity) {
    return NextResponse.json({ connected: true, identityId: identity.identityId });
  }
  return NextResponse.json({ connected: false });
}
