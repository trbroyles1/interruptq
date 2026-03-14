import type { DayOfWeek, DaySchedule, WorkingHours, ActivityWithDuration } from "@/types";

const WEEKDAYS: DayOfWeek[] = ["mon", "tue", "wed", "thu", "fri"];
const WEEKEND: DayOfWeek[] = ["sat", "sun"];
const ALL_DAYS: DayOfWeek[] = [...WEEKDAYS, ...WEEKEND];

const DEFAULT_WORK_SCHEDULE: DaySchedule = { enabled: true, start: "09:00", end: "17:00" };
const DEFAULT_OFF_SCHEDULE: DaySchedule = { enabled: false, start: "09:00", end: "17:00" };

export function makeWorkingHours(
  overrides?: Partial<Record<DayOfWeek, Partial<DaySchedule>>>,
): WorkingHours {
  const base = {} as WorkingHours;
  for (const day of ALL_DAYS) {
    const isWeekday = WEEKDAYS.includes(day);
    const defaults = isWeekday ? DEFAULT_WORK_SCHEDULE : DEFAULT_OFF_SCHEDULE;
    base[day] = { ...defaults, ...overrides?.[day] };
  }
  return base;
}

const DEFAULT_ACTIVITY: ActivityWithDuration = {
  id: 1,
  timestamp: "2026-01-05T14:00:00.000Z",
  text: "Working on PROJ-1",
  tickets: ["PROJ-1"],
  tags: [],
  classification: "green",
  sprintId: null,
  onCallAtTime: false,
  durationMinutes: 30,
};

export function makeActivity(
  overrides?: Partial<ActivityWithDuration>,
): ActivityWithDuration {
  return { ...DEFAULT_ACTIVITY, ...overrides };
}
