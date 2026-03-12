import { NextResponse } from "next/server";
import { ensureDb } from "@/db/init";
import { validateShareLink } from "@/lib/share";
import { computeReportData } from "@/lib/report-data";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ shareId: string }> }
) {
  await ensureDb();
  const { shareId } = await params;

  const link = await validateShareLink(shareId);
  if (!link) {
    return NextResponse.json(
      { error: "Share link expired or invalid" },
      { status: 404 }
    );
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!from || !to) {
    return NextResponse.json(
      { error: "from and to query params required" },
      { status: 400 }
    );
  }

  const result = await computeReportData(link.identityId, from, to);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json(result.data);
}
