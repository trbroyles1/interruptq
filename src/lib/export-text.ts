import { formatMinutes, formatPct, type RangeMetrics } from "./metrics";

interface ExportData extends RangeMetrics {
  goalChangeCount?: number;
  priorityChangeCount?: number;
  onCallMinutes?: number;
  onCallTicketMinutes?: number;
  goalProgress?: { goal: string; minutes: number }[];
  from: string;
  to: string;
}

export function generateTextExport(data: ExportData): string {
  const lines: string[] = [];

  lines.push(`InterruptQ Report: ${data.from} → ${data.to}`);
  lines.push("=".repeat(50));
  lines.push("");

  // Time summary
  lines.push("TIME BREAKDOWN");
  lines.push(`  Total tracked: ${formatMinutes(data.totalMinutes)}`);
  lines.push(
    `  On-target (green):    ${formatMinutes(data.greenMinutes)} (${formatPct(data.greenPct)})`
  );
  lines.push(
    `  Re-prioritized (yellow): ${formatMinutes(data.yellowMinutes)} (${formatPct(data.yellowPct)})`
  );
  lines.push(
    `  Interrupted (red):    ${formatMinutes(data.redMinutes)} (${formatPct(data.redPct)})`
  );
  lines.push("");

  // Context switches
  lines.push("CONTEXT SWITCHES");
  lines.push(`  Total: ${data.totalContextSwitches}`);
  lines.push(
    `  Mean time between: ${formatMinutes(data.meanTimeBetweenSwitches)}`
  );
  if (data.dailyBreakdown.length > 1) {
    lines.push(
      `  Daily avg: ${Math.round(data.totalContextSwitches / data.dailyBreakdown.length)}`
    );
  }
  lines.push("");

  // Focus time
  lines.push("MEAN FOCUS TIME");
  lines.push(`  Overall: ${formatMinutes(data.meanFocusTime)}`);
  lines.push(`  On-target: ${formatMinutes(data.meanGreenFocus)}`);
  lines.push(`  Re-prioritized: ${formatMinutes(data.meanYellowFocus)}`);
  lines.push(`  Interrupted: ${formatMinutes(data.meanRedFocus)}`);
  lines.push("");

  // Top activities
  if (data.perActivity.length > 0) {
    lines.push("TOP ACTIVITIES");
    for (const a of data.perActivity.slice(0, 10)) {
      lines.push(`  ${formatMinutes(a.minutes).padEnd(8)} ${a.text}`);
    }
    lines.push("");
  }

  // Per-person
  if (data.perPerson.length > 0) {
    lines.push("TIME BY PERSON");
    for (const p of data.perPerson) {
      lines.push(
        `  @${p.person}: ${formatMinutes(p.minutes)} (${p.switchCount} switches)`
      );
    }
    lines.push("");
  }

  // Sprint goal progress
  if (data.goalProgress && data.goalProgress.length > 0) {
    lines.push("SPRINT GOAL PROGRESS");
    for (const g of data.goalProgress) {
      const pct =
        data.totalMinutes > 0
          ? formatPct((g.minutes / data.totalMinutes) * 100)
          : "0%";
      lines.push(`  ${g.goal}: ${formatMinutes(g.minutes)} (${pct})`);
    }
    lines.push("");
  }

  // Priority drift
  if (
    data.goalChangeCount !== undefined ||
    data.priorityChangeCount !== undefined
  ) {
    lines.push("PRIORITY DRIFT");
    lines.push(`  Goal changes: ${data.goalChangeCount ?? 0}`);
    lines.push(`  Priority changes: ${data.priorityChangeCount ?? 0}`);
    lines.push("");
  }

  // On-call
  if (data.onCallMinutes && data.onCallMinutes > 0) {
    lines.push("ON-CALL");
    lines.push(`  On-call time: ${formatMinutes(data.onCallMinutes)}`);
    lines.push(
      `  On-call ticket time: ${formatMinutes(data.onCallTicketMinutes ?? 0)}`
    );
    lines.push("");
  }

  return lines.join("\n");
}
