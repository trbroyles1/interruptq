import { NextResponse } from "next/server";
import { ensureDb } from "@/db/init";
import { withIdentity } from "@/lib/auth";
import { computeReportData } from "@/lib/report-data";

export const GET = withIdentity(async (request: Request, identityId: number) => {
  await ensureDb();
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!from || !to) {
    return NextResponse.json(
      { error: "from and to query params required" },
      { status: 400 }
    );
  }

  const result = await computeReportData(identityId, from, to);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json(result.data);
});
