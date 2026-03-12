import type { ActivityWithDuration, Classification } from "@/types";
import { toZonedDateStr } from "@/lib/timezone";

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

function computeTimeByClassification(sorted: ActivityWithDuration[]) {
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

  return { greenMinutes, yellowMinutes, redMinutes, breakMinutes, totalMinutes, greenPct, yellowPct, redPct };
}

function computeContextSwitches(
  nonBreakSorted: ActivityWithDuration[],
  tz: string,
  totalMinutes: number
) {
  const dayFirstEntries = new Set<string>();
  let totalContextSwitches = 0;
  for (const a of nonBreakSorted) {
    const day = toZonedDateStr(a.timestamp, tz);
    if (dayFirstEntries.has(day)) {
      totalContextSwitches++;
    } else {
      dayFirstEntries.add(day);
    }
  }

  const meanTimeBetweenSwitches =
    totalContextSwitches > 0 ? totalMinutes / totalContextSwitches : totalMinutes;

  return { totalContextSwitches, meanTimeBetweenSwitches };
}

function computeFocusBlocks(sorted: ActivityWithDuration[]) {
  const focusBlocks: { classification: Classification; minutes: number }[] = [];
  let currentBlock: { classification: Classification; minutes: number } | null = null;

  for (const a of sorted) {
    if (a.classification === "break") {
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

  const maxBlock = (blocks: typeof focusBlocks) =>
    blocks.length > 0 ? Math.max(...blocks.map((b) => b.minutes)) : 0;

  return {
    meanFocusTime: avgFocus(focusBlocks),
    meanGreenFocus: avgFocus(focusBlocks.filter((b) => b.classification === "green")),
    meanYellowFocus: avgFocus(focusBlocks.filter((b) => b.classification === "yellow")),
    meanRedFocus: avgFocus(focusBlocks.filter((b) => b.classification === "red")),
    longestBlock: maxBlock(focusBlocks),
    longestGreenBlock: maxBlock(focusBlocks.filter((b) => b.classification === "green")),
    longestYellowBlock: maxBlock(focusBlocks.filter((b) => b.classification === "yellow")),
    longestRedBlock: maxBlock(focusBlocks.filter((b) => b.classification === "red")),
  };
}

function computePerActivity(sorted: ActivityWithDuration[]) {
  const activityMap = new Map<string, number>();
  for (const a of sorted) {
    if (a.classification === "break") continue;
    activityMap.set(a.text, (activityMap.get(a.text) ?? 0) + a.durationMinutes);
  }
  return Array.from(activityMap.entries())
    .map(([text, minutes]) => ({ text, minutes }))
    .sort((a, b) => b.minutes - a.minutes);
}

function computePerTicket(sorted: ActivityWithDuration[]) {
  const ticketMap = new Map<string, number>();
  for (const a of sorted) {
    if (a.classification === "break") continue;
    for (const ticket of a.tickets) {
      ticketMap.set(ticket, (ticketMap.get(ticket) ?? 0) + a.durationMinutes);
    }
  }
  return Array.from(ticketMap.entries())
    .map(([ticket, minutes]) => ({ ticket, minutes }))
    .sort((a, b) => b.minutes - a.minutes);
}

function computePerPerson(nonBreakSorted: ActivityWithDuration[]): RangeMetrics["perPerson"] {
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
  return Array.from(personMap.entries())
    .map(([person, data]) => ({
      person,
      minutes: data.minutes,
      switchCount: data.switchCount,
      greenMinutes: data.green,
      yellowMinutes: data.yellow,
      redMinutes: data.red,
    }))
    .sort((a, b) => b.minutes - a.minutes);
}

function computeDailyBreakdown(sorted: ActivityWithDuration[], tz: string): DayMetrics[] {
  const dayMap = new Map<string, ActivityWithDuration[]>();
  for (const a of sorted) {
    const day = toZonedDateStr(a.timestamp, tz);
    if (!dayMap.has(day)) dayMap.set(day, []);
    dayMap.get(day)!.push(a);
  }

  return Array.from(dayMap.entries())
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
}

/**
 * Compute all derived metrics for a set of activities (already with durations).
 */
export function computeMetrics(
  activities: ActivityWithDuration[],
  tz: string
): RangeMetrics {
  const sorted = [...activities].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  const nonBreakSorted = sorted.filter((a) => a.classification !== "break");

  const time = computeTimeByClassification(sorted);
  const switches = computeContextSwitches(nonBreakSorted, tz, time.totalMinutes);
  const focus = computeFocusBlocks(sorted);
  const perActivity = computePerActivity(sorted);
  const perTicket = computePerTicket(sorted);
  const perPerson = computePerPerson(nonBreakSorted);
  const dailyBreakdown = computeDailyBreakdown(sorted, tz);

  return {
    ...time,
    ...switches,
    ...focus,
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
