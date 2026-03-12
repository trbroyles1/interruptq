import type { WorkingHours, DayOfWeek } from "@/types";

const DAY_MAP: DayOfWeek[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

/**
 * Get the DayOfWeek key for a Date object.
 */
export function getDayOfWeek(date: Date): DayOfWeek {
  return DAY_MAP[date.getDay()];
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
 * trimmed to working hours.
 *
 * @param start - ISO datetime string when this activity began
 * @param end - ISO datetime string when the next activity began (or end of day)
 * @param workingHours - the user's working hours config
 */
export function computeBlockDuration(
  start: string,
  end: string,
  workingHours: WorkingHours
): number {
  const startDate = new Date(start);
  const endDate = new Date(end);

  if (endDate <= startDate) return 0;

  let totalMinutes = 0;

  // Iterate day-by-day from start to end
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);

  while (current <= endDate) {
    const dayKey = getDayOfWeek(current);
    const schedule = workingHours[dayKey];

    if (schedule.enabled) {
      const dayStart = new Date(current);
      const [sh, sm] = schedule.start.split(":").map(Number);
      dayStart.setHours(sh, sm, 0, 0);

      const dayEnd = new Date(current);
      const [eh, em] = schedule.end.split(":").map(Number);
      dayEnd.setHours(eh, em, 0, 0);

      // Overlap of [start, end] with [dayStart, dayEnd]
      const overlapStart = new Date(Math.max(startDate.getTime(), dayStart.getTime()));
      const overlapEnd = new Date(Math.min(endDate.getTime(), dayEnd.getTime()));

      if (overlapEnd > overlapStart) {
        totalMinutes += (overlapEnd.getTime() - overlapStart.getTime()) / 60000;
      }
    }

    // Move to next day
    current.setDate(current.getDate() + 1);
  }

  return Math.round(totalMinutes * 100) / 100;
}

/**
 * Get the end-of-working-day timestamp for a given date.
 * Returns null if the day is not a working day.
 */
export function getEndOfWorkDay(
  date: Date,
  workingHours: WorkingHours
): Date | null {
  const dayKey = getDayOfWeek(date);
  const schedule = workingHours[dayKey];

  if (!schedule.enabled) return null;

  const endOfDay = new Date(date);
  const [eh, em] = schedule.end.split(":").map(Number);
  endOfDay.setHours(eh, em, 0, 0);
  return endOfDay;
}

/**
 * Get the start-of-working-day timestamp for a given date.
 * Returns null if the day is not a working day.
 */
export function getStartOfWorkDay(
  date: Date,
  workingHours: WorkingHours
): Date | null {
  const dayKey = getDayOfWeek(date);
  const schedule = workingHours[dayKey];

  if (!schedule.enabled) return null;

  const startOfDay = new Date(date);
  const [sh, sm] = schedule.start.split(":").map(Number);
  startOfDay.setHours(sh, sm, 0, 0);
  return startOfDay;
}
