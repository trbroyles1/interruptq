import type { ActivityWithDuration, Classification, WorkingHours } from "@/types";

export interface DayMetrics {
  date: string;
  totalMinutes: number;
  breakMinutes: number;
  greenMinutes: number;
  yellowMinutes: number;
  redMinutes: number;
  contextSwitches: number;
  activities: ActivityWithDuration[];
}

export interface RangeMetrics {
  totalMinutes: number;
  breakMinutes: number;
  greenMinutes: number;
  yellowMinutes: number;
  redMinutes: number;
  greenPct: number;
  yellowPct: number;
  redPct: number;
  totalContextSwitches: number;
  meanTimeBetweenSwitches: number;
  meanFocusTime: number;
  meanGreenFocus: number;
  meanYellowFocus: number;
  meanRedFocus: number;
  longestBlock: number;
  longestGreenBlock: number;
  longestYellowBlock: number;
  longestRedBlock: number;
  perActivity: { text: string; minutes: number }[];
  perTicket: { ticket: string; minutes: number }[];
  perPerson: {
    person: string;
    minutes: number;
    switchCount: number;
    greenMinutes: number;
    yellowMinutes: number;
    redMinutes: number;
  }[];
  dailyBreakdown: DayMetrics[];
}

/**
 * Compute all derived metrics for a set of activities (already with durations).
 */
export function computeMetrics(
  activities: ActivityWithDuration[]
): RangeMetrics {
  const sorted = [...activities].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Basic time by classification
  let greenMinutes = 0;
  let yellowMinutes = 0;
  let redMinutes = 0;
  let breakMinutes = 0;

  for (const a of sorted) {
    switch (a.classification) {
      case "green": greenMinutes += a.durationMinutes; break;
      case "yellow": yellowMinutes += a.durationMinutes; break;
      case "red": redMinutes += a.durationMinutes; break;
      case "break": breakMinutes += a.durationMinutes; break;
    }
  }

  const totalMinutes = greenMinutes + yellowMinutes + redMinutes;
  const greenPct = totalMinutes > 0 ? (greenMinutes / totalMinutes) * 100 : 0;
  const yellowPct = totalMinutes > 0 ? (yellowMinutes / totalMinutes) * 100 : 0;
  const redPct = totalMinutes > 0 ? (redMinutes / totalMinutes) * 100 : 0;

  // Context switches: count of non-break activity entries, minus the first entry per day
  // Breaks are invisible for context switch purposes
  const nonBreakSorted = sorted.filter((a) => a.classification !== "break");
  const dayFirstEntries = new Set<string>();
  let totalContextSwitches = 0;
  for (const a of nonBreakSorted) {
    const day = a.timestamp.split("T")[0];
    if (dayFirstEntries.has(day)) {
      totalContextSwitches++;
    } else {
      dayFirstEntries.add(day);
    }
  }

  const meanTimeBetweenSwitches =
    totalContextSwitches > 0 ? totalMinutes / totalContextSwitches : totalMinutes;

  // Focus time: average duration of consecutive same-color blocks
  // Breaks interrupt continuity but are not themselves focus blocks
  const focusBlocks: { classification: Classification; minutes: number }[] = [];
  let currentBlock: { classification: Classification; minutes: number } | null = null;

  for (const a of sorted) {
    if (a.classification === "break") {
      // Break ends current focus block but is not itself a block
      if (currentBlock) {
        focusBlocks.push(currentBlock);
        currentBlock = null;
      }
      continue;
    }

    if (currentBlock && currentBlock.classification === a.classification) {
      currentBlock.minutes += a.durationMinutes;
    } else {
      if (currentBlock) focusBlocks.push(currentBlock);
      currentBlock = { classification: a.classification, minutes: a.durationMinutes };
    }
  }
  if (currentBlock) focusBlocks.push(currentBlock);

  const avgFocus = (blocks: typeof focusBlocks) =>
    blocks.length > 0
      ? blocks.reduce((s, b) => s + b.minutes, 0) / blocks.length
      : 0;

  const meanFocusTime = avgFocus(focusBlocks);
  const meanGreenFocus = avgFocus(focusBlocks.filter((b) => b.classification === "green"));
  const meanYellowFocus = avgFocus(focusBlocks.filter((b) => b.classification === "yellow"));
  const meanRedFocus = avgFocus(focusBlocks.filter((b) => b.classification === "red"));

  const maxBlock = (blocks: typeof focusBlocks) =>
    blocks.length > 0 ? Math.max(...blocks.map((b) => b.minutes)) : 0;

  const longestBlock = maxBlock(focusBlocks);
  const longestGreenBlock = maxBlock(focusBlocks.filter((b) => b.classification === "green"));
  const longestYellowBlock = maxBlock(focusBlocks.filter((b) => b.classification === "yellow"));
  const longestRedBlock = maxBlock(focusBlocks.filter((b) => b.classification === "red"));

  // Per-activity time (exclude breaks)
  const activityMap = new Map<string, number>();
  for (const a of sorted) {
    if (a.classification === "break") continue;
    activityMap.set(a.text, (activityMap.get(a.text) ?? 0) + a.durationMinutes);
  }
  const perActivity = Array.from(activityMap.entries())
    .map(([text, minutes]) => ({ text, minutes }))
    .sort((a, b) => b.minutes - a.minutes);

  // Per-ticket time (exclude breaks)
  const ticketMap = new Map<string, number>();
  for (const a of sorted) {
    if (a.classification === "break") continue;
    for (const ticket of a.tickets) {
      ticketMap.set(ticket, (ticketMap.get(ticket) ?? 0) + a.durationMinutes);
    }
  }
  const perTicket = Array.from(ticketMap.entries())
    .map(([ticket, minutes]) => ({ ticket, minutes }))
    .sort((a, b) => b.minutes - a.minutes);

  // Per-person time + switches (exclude breaks)
  const personMap = new Map<
    string,
    { minutes: number; switchCount: number; green: number; yellow: number; red: number }
  >();
  for (let i = 0; i < nonBreakSorted.length; i++) {
    const a = nonBreakSorted[i];
    for (const tag of a.tags) {
      const key = tag.toLowerCase();
      const entry = personMap.get(key) ?? {
        minutes: 0,
        switchCount: 0,
        green: 0,
        yellow: 0,
        red: 0,
      };
      entry.minutes += a.durationMinutes;
      if (a.classification === "green") entry.green += a.durationMinutes;
      else if (a.classification === "yellow") entry.yellow += a.durationMinutes;
      else entry.red += a.durationMinutes;

      // Count as a switch if the previous non-break activity didn't involve this person
      if (i > 0) {
        const prev = nonBreakSorted[i - 1];
        const prevTags = prev.tags.map((t) => t.toLowerCase());
        if (!prevTags.includes(key)) {
          entry.switchCount++;
        }
      }

      personMap.set(key, entry);
    }
  }
  const perPerson = Array.from(personMap.entries())
    .map(([person, data]) => ({
      person,
      minutes: data.minutes,
      switchCount: data.switchCount,
      greenMinutes: data.green,
      yellowMinutes: data.yellow,
      redMinutes: data.red,
    }))
    .sort((a, b) => b.minutes - a.minutes);

  // Daily breakdown
  const dayMap = new Map<string, ActivityWithDuration[]>();
  for (const a of sorted) {
    const day = a.timestamp.split("T")[0];
    if (!dayMap.has(day)) dayMap.set(day, []);
    dayMap.get(day)!.push(a);
  }

  const dailyBreakdown: DayMetrics[] = Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dayActivities]) => {
      let dGreen = 0, dYellow = 0, dRed = 0, dBreak = 0;
      for (const a of dayActivities) {
        if (a.classification === "green") dGreen += a.durationMinutes;
        else if (a.classification === "yellow") dYellow += a.durationMinutes;
        else if (a.classification === "red") dRed += a.durationMinutes;
        else if (a.classification === "break") dBreak += a.durationMinutes;
      }
      const nonBreakCount = dayActivities.filter((a) => a.classification !== "break").length;
      return {
        date,
        totalMinutes: dGreen + dYellow + dRed,
        breakMinutes: dBreak,
        greenMinutes: dGreen,
        yellowMinutes: dYellow,
        redMinutes: dRed,
        contextSwitches: Math.max(0, nonBreakCount - 1),
        activities: dayActivities,
      };
    });

  return {
    totalMinutes,
    breakMinutes,
    greenMinutes,
    yellowMinutes,
    redMinutes,
    greenPct,
    yellowPct,
    redPct,
    totalContextSwitches,
    meanTimeBetweenSwitches,
    meanFocusTime,
    meanGreenFocus,
    meanYellowFocus,
    meanRedFocus,
    longestBlock,
    longestGreenBlock,
    longestYellowBlock,
    longestRedBlock,
    perActivity,
    perTicket,
    perPerson,
    dailyBreakdown,
  };
}

export function formatMinutes(minutes: number): string {
  if (minutes < 1) return "< 1m";
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function formatPct(pct: number): string {
  return `${Math.round(pct)}%`;
}
