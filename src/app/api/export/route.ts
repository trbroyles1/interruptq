import { NextResponse } from "next/server";
import { ensureDb } from "@/db/init";
import { withIdentity } from "@/lib/auth";
import { computeReportData } from "@/lib/report-data";
import { generateTextExport } from "@/lib/export-text";

export const GET = withIdentity(async (request: Request, identityId: number) => {
  await ensureDb();
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const format = searchParams.get("format") ?? "text";

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

  if (format === "text") {
    const text = generateTextExport({
      ...result.data,
      from,
      to,
    });

    return new Response(text, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  return NextResponse.json(
    { error: "PDF export not yet implemented. Use format=text." },
    { status: 501 }
  );
});
