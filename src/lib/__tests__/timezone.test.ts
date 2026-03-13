import { describe, it, expect, vi, afterEach } from "vitest";
import {
  toZonedParts,
  toZonedDateStr,
  toZonedTimeStr,
  utcForTimeInTz,
  dayBoundsUTC,
  todayInTz,
  nowUTC,
} from "@/lib/timezone";

describe("toZonedParts", () => {
  it("converts a UTC instant to EST components", () => {
    const parts = toZonedParts("2026-01-05T15:30:00.000Z", "America/New_York");
    expect(parts.hour).toBe(10);
    expect(parts.minute).toBe(30);
    expect(parts.dayOfWeek).toBe(1);
  });

  it("returns UTC components when timezone is UTC", () => {
    const parts = toZonedParts("2026-01-05T15:30:00.000Z", "UTC");
    expect(parts.hour).toBe(15);
    expect(parts.minute).toBe(30);
  });

  it("handles EDT (summer time)", () => {
    const parts = toZonedParts("2026-07-05T04:00:00.000Z", "America/New_York");
    expect(parts.hour).toBe(0);
    expect(parts.minute).toBe(0);
    expect(parts.day).toBe(5);
  });
});

describe("toZonedDateStr", () => {
  it("returns the correct date string in EST", () => {
    expect(toZonedDateStr("2026-01-05T15:30:00.000Z", "America/New_York")).toBe("2026-01-05");
  });

  it("returns the previous day when UTC time crosses midnight boundary in EST", () => {
    expect(toZonedDateStr("2026-01-06T03:00:00.000Z", "America/New_York")).toBe("2026-01-05");
  });
});

describe("toZonedTimeStr", () => {
  it("returns the correct time string in EST", () => {
    expect(toZonedTimeStr("2026-01-05T15:30:00.000Z", "America/New_York")).toBe("10:30");
  });

  it("zero-pads single-digit hours and minutes", () => {
    expect(toZonedTimeStr("2026-01-05T05:05:00.000Z", "UTC")).toBe("05:05");
  });
});

describe("utcForTimeInTz", () => {
  it("converts standard time (EST) to UTC", () => {
    expect(utcForTimeInTz("2026-01-05", "09:00", "America/New_York")).toBe("2026-01-05T14:00:00.000Z");
  });

  it("converts daylight time (EDT) to UTC", () => {
    expect(utcForTimeInTz("2026-07-05", "09:00", "America/New_York")).toBe("2026-07-05T13:00:00.000Z");
  });

  it("handles DST spring-forward correctly", () => {
    const result = utcForTimeInTz("2026-03-08", "03:00", "America/New_York");
    expect(result).toBe("2026-03-08T07:00:00.000Z");
  });
});

describe("dayBoundsUTC", () => {
  it("returns correct bounds for EST", () => {
    const bounds = dayBoundsUTC("2026-01-05", "America/New_York");
    expect(bounds.start).toBe("2026-01-05T05:00:00.000Z");
  });

  it("returns correct bounds for UTC", () => {
    const bounds = dayBoundsUTC("2026-01-05", "UTC");
    expect(bounds.start).toBe("2026-01-05T00:00:00.000Z");
  });

  it("end time has seconds equal to 59", () => {
    const bounds = dayBoundsUTC("2026-01-05", "America/New_York");
    const endDate = new Date(bounds.end);
    expect(endDate.getUTCSeconds()).toBe(59);
  });
});

describe("todayInTz and nowUTC", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns today's date in New York timezone", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T20:00:00.000Z"));
    expect(todayInTz("America/New_York")).toBe("2026-06-15");
  });

  it("returns next day for Tokyo when UTC is still previous day evening", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T20:00:00.000Z"));
    expect(todayInTz("Asia/Tokyo")).toBe("2026-06-16");
  });

  it("returns the current UTC ISO string", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T20:00:00.000Z"));
    expect(nowUTC()).toBe("2026-06-15T20:00:00.000Z");
  });
});
