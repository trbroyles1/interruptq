import { NextResponse } from "next/server";
import { getIdentityFromRequest } from "@/lib/auth";

export async function GET(request: Request) {
  const identity = await getIdentityFromRequest(request);
  if (identity) {
    return NextResponse.json({ connected: true, identityId: identity.identityId });
  }
  return NextResponse.json({ connected: false });
}
