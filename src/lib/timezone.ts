/**
 * Timezone conversion utilities.
 *
 * All activity timestamps are stored as UTC ISO strings.
 * These helpers convert between UTC and a user's IANA timezone
 * for display, day-bucketing, query boundaries, and working-hours math.
 *
 * Uses native Intl APIs only — no third-party libraries.
 */

export interface ZonedParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
  dayOfWeek: number; // 0=Sun, 1=Mon, ..., 6=Sat
}

const partFormatters = new Map<string, Intl.DateTimeFormat>();

function getPartFormatter(tz: string): Intl.DateTimeFormat {
  let fmt = partFormatters.get(tz);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      weekday: "short",
    });
    partFormatters.set(tz, fmt);
  }
  return fmt;
}

const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/**
 * Extract date/time components for a UTC instant in the given timezone.
 */
export function toZonedParts(utcISO: string, tz: string): ZonedParts {
  const date = new Date(utcISO);
  const fmt = getPartFormatter(tz);
  const parts = fmt.formatToParts(date);

  const map: Record<string, string> = {};
  for (const p of parts) {
    map[p.type] = p.value;
  }

  return {
    year: parseInt(map.year, 10),
    month: parseInt(map.month, 10),
    day: parseInt(map.day, 10),
    hour: map.hour === "24" ? 0 : parseInt(map.hour, 10),
    minute: parseInt(map.minute, 10),
    second: parseInt(map.second, 10),
    dayOfWeek: WEEKDAY_MAP[map.weekday] ?? 0,
  };
}

/**
 * Convert a UTC ISO timestamp to "YYYY-MM-DD" in the given timezone.
 */
export function toZonedDateStr(utcISO: string, tz: string): string {
  const p = toZonedParts(utcISO, tz);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/**
 * Convert a UTC ISO timestamp to "HH:MM" in the given timezone.
 */
export function toZonedTimeStr(utcISO: string, tz: string): string {
  const p = toZonedParts(utcISO, tz);
  return `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
}

/**
 * Get today's date as "YYYY-MM-DD" in the given timezone.
 */
export function todayInTz(tz: string): string {
  return toZonedDateStr(new Date().toISOString(), tz);
}

/**
 * Convenience: current UTC ISO string.
 */
export function nowUTC(): string {
  return new Date().toISOString();
}

/**
 * Compute the UTC offset in minutes for a given instant in a timezone.
 * Positive means ahead of UTC (e.g., +60 for CET), negative for behind (e.g., -300 for EST).
 */
function getUTCOffsetMinutes(date: Date, tz: string): number {
  const parts = toZonedParts(date.toISOString(), tz);
  const asUTC = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return Math.round((asUTC - date.getTime()) / 60000);
}

/**
 * Get the UTC ISO string for a specific wall-clock time in a timezone.
 *
 * E.g., utcForTimeInTz("2026-03-11", "18:00", "America/New_York")
 * returns the UTC instant when it's 6:00 PM ET on March 11, 2026.
 *
 * Handles DST correctly by computing the actual offset at the target moment.
 */
export function utcForTimeInTz(dateStr: string, timeStr: string, tz: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = timeStr.split(":").map(Number);

  // Use noon as a reference point to get approximate offset (avoids DST boundary at midnight)
  const noonRef = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const approxOffset = getUTCOffsetMinutes(noonRef, tz);

  // First estimate: the target wall-clock time minus the offset gives UTC
  const estimateUTC = new Date(Date.UTC(year, month - 1, day, hour, minute, 0) - approxOffset * 60000);

  // Verify: check what the actual offset is at this estimated time
  const actualOffset = getUTCOffsetMinutes(estimateUTC, tz);

  // If the offset differs (DST transition between noon and the target time), re-adjust
  const finalUTC = new Date(Date.UTC(year, month - 1, day, hour, minute, 0) - actualOffset * 60000);

  return finalUTC.toISOString();
}

/**
 * Get UTC ISO strings for the start and end of a calendar day in the given timezone.
 *
 * Returns { start, end } where:
 *   start = UTC instant of 00:00:00 on dateStr in tz
 *   end   = UTC instant of 23:59:59 on dateStr in tz
 *
 * DST-safe: a day may be 23 or 25 hours in wall-clock time.
 */
export function dayBoundsUTC(
  dateStr: string,
  tz: string
): { start: string; end: string } {
  const start = utcForTimeInTz(dateStr, "00:00", tz);

  // Compute 23:59 and add 59 seconds for end-of-day 23:59:59
  const endBase = new Date(utcForTimeInTz(dateStr, "23:59", tz));
  endBase.setUTCSeconds(59);

  return { start, end: endBase.toISOString() };
}
