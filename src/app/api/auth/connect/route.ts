import { NextResponse } from "next/server";
import { resolveIdentity } from "@/lib/identity";
import { setCookieHeader, isSecureRequest } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json();
  const token: string | undefined = body.token?.trim();

  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  const identity = await resolveIdentity(token);
  if (!identity) {
    return NextResponse.json({ error: "Token not recognized" }, { status: 401 });
  }

  const response = NextResponse.json({ connected: true });
  response.headers.set(
    "Set-Cookie",
    setCookieHeader(token, isSecureRequest(request))
  );
  return response;
}
