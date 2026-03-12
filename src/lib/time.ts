import type { WorkingHours, DayOfWeek } from "@/types";
import {
  toZonedParts,
  toZonedDateStr,
  utcForTimeInTz,
  dayBoundsUTC,
} from "@/lib/timezone";

const DAY_MAP: DayOfWeek[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

/**
 * Get the DayOfWeek key for a UTC ISO timestamp in the given timezone.
 */
export function getDayOfWeek(utcISO: string, tz: string): DayOfWeek {
  const parts = toZonedParts(utcISO, tz);
  return DAY_MAP[parts.dayOfWeek];
}

/**
 * Parse a "HH:MM" time string into minutes since midnight.
 */
export function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Compute the effective duration (in minutes) of an activity block,
 * trimmed to working hours in the user's timezone.
 *
 * @param start - UTC ISO datetime string when this activity began
 * @param end - UTC ISO datetime string when the next activity began (or now)
 * @param workingHours - the user's working hours config
 * @param tz - IANA timezone identifier
 */
export function computeBlockDuration(
  start: string,
  end: string,
  workingHours: WorkingHours,
  tz: string
): number {
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();

  if (endMs <= startMs) return 0;

  let totalMinutes = 0;

  // Determine the calendar day range in the user's timezone
  const startDateStr = toZonedDateStr(start, tz);
  const endDateStr = toZonedDateStr(end, tz);

  // Iterate through each calendar day in the user's timezone
  let currentDateStr = startDateStr;

  while (currentDateStr <= endDateStr) {
    // Get the day-of-week for this date in the user's timezone
    const bounds = dayBoundsUTC(currentDateStr, tz);
    const dayKey = getDayOfWeek(bounds.start, tz);
    const schedule = workingHours[dayKey];

    if (schedule.enabled) {
      // Get UTC instants for working hours start/end on this day
      const workStartMs = new Date(utcForTimeInTz(currentDateStr, schedule.start, tz)).getTime();
      const workEndMs = new Date(utcForTimeInTz(currentDateStr, schedule.end, tz)).getTime();

      // Overlap of [start, end] with [workStart, workEnd]
      const overlapStart = Math.max(startMs, workStartMs);
      const overlapEnd = Math.min(endMs, workEndMs);

      if (overlapEnd > overlapStart) {
        totalMinutes += (overlapEnd - overlapStart) / 60000;
      }
    }

    // Advance to next calendar day
    currentDateStr = nextDateStr(currentDateStr);
  }

  return Math.round(totalMinutes * 100) / 100;
}

/**
 * Advance a "YYYY-MM-DD" string by one day.
 */
function nextDateStr(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().split("T")[0];
}

/**
 * Get the end-of-working-day as a UTC Date for a given UTC ISO timestamp
 * in the user's timezone. Returns null if the day is not a working day.
 */
export function getEndOfWorkDay(
  utcISO: string,
  workingHours: WorkingHours,
  tz: string
): Date | null {
  const dateStr = toZonedDateStr(utcISO, tz);
  const dayKey = getDayOfWeek(utcISO, tz);
  const schedule = workingHours[dayKey];

  if (!schedule.enabled) return null;

  return new Date(utcForTimeInTz(dateStr, schedule.end, tz));
}

/**
 * Get the start-of-working-day as a UTC Date for a given UTC ISO timestamp
 * in the user's timezone. Returns null if the day is not a working day.
 */
export function getStartOfWorkDay(
  utcISO: string,
  workingHours: WorkingHours,
  tz: string
): Date | null {
  const dateStr = toZonedDateStr(utcISO, tz);
  const dayKey = getDayOfWeek(utcISO, tz);
  const schedule = workingHours[dayKey];

  if (!schedule.enabled) return null;

  return new Date(utcForTimeInTz(dateStr, schedule.start, tz));
}
