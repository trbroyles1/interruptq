import { describe, it, expect } from "vitest";
import {
  parseTimeToMinutes,
  getDayOfWeek,
  computeBlockDuration,
  getEndOfWorkDay,
  getStartOfWorkDay,
} from "@/lib/time";
import { makeWorkingHours } from "./helpers";

describe("parseTimeToMinutes", () => {
  it("parses 09:00 to 540", () => {
    expect(parseTimeToMinutes("09:00")).toBe(540);
  });

  it("parses 00:00 to 0", () => {
    expect(parseTimeToMinutes("00:00")).toBe(0);
  });

  it("parses 23:59 to 1439", () => {
    expect(parseTimeToMinutes("23:59")).toBe(1439);
  });

  it("parses 17:30 to 1050", () => {
    expect(parseTimeToMinutes("17:30")).toBe(1050);
  });
});

describe("getDayOfWeek", () => {
  it("returns mon for a Monday UTC timestamp", () => {
    expect(getDayOfWeek("2026-01-05T14:00:00.000Z", "UTC")).toBe("mon");
  });

  it("returns sun when EST interpretation is still Sunday", () => {
    expect(getDayOfWeek("2026-01-05T03:00:00.000Z", "America/New_York")).toBe("sun");
  });

  it("returns mon when UTC interpretation is Monday", () => {
    expect(getDayOfWeek("2026-01-05T03:00:00.000Z", "UTC")).toBe("mon");
  });
});

describe("computeBlockDuration", () => {
  const workingHours = makeWorkingHours();
  const tz = "America/New_York";

  it("counts full duration when block is within work hours", () => {
    const result = computeBlockDuration(
      "2026-01-05T15:00:00.000Z",
      "2026-01-05T17:00:00.000Z",
      workingHours,
      tz
    );
    expect(result).toBe(120);
  });

  it("trims start to work-hours start when block begins before work", () => {
    const result = computeBlockDuration(
      "2026-01-05T12:00:00.000Z",
      "2026-01-05T17:00:00.000Z",
      workingHours,
      tz
    );
    expect(result).toBe(180);
  });

  it("trims end to work-hours end when block extends past work", () => {
    const result = computeBlockDuration(
      "2026-01-05T20:00:00.000Z",
      "2026-01-06T01:00:00.000Z",
      workingHours,
      tz
    );
    expect(result).toBe(120);
  });

  it("returns 0 when block is entirely outside work hours", () => {
    const result = computeBlockDuration(
      "2026-01-05T23:00:00.000Z",
      "2026-01-06T01:00:00.000Z",
      workingHours,
      tz
    );
    expect(result).toBe(0);
  });

  it("accumulates work minutes across an overnight span", () => {
    const result = computeBlockDuration(
      "2026-01-05T21:00:00.000Z",
      "2026-01-06T15:00:00.000Z",
      workingHours,
      tz
    );
    expect(result).toBe(120);
  });

  it("returns 0 for a disabled Saturday", () => {
    const result = computeBlockDuration(
      "2026-01-10T15:00:00.000Z",
      "2026-01-10T19:00:00.000Z",
      workingHours,
      tz
    );
    expect(result).toBe(0);
  });

  it("skips weekend days in a multi-day span", () => {
    const result = computeBlockDuration(
      "2026-01-09T21:00:00.000Z",
      "2026-01-12T15:00:00.000Z",
      workingHours,
      tz
    );
    expect(result).toBe(120);
  });

  it("returns 0 when end is before or equal to start", () => {
    expect(computeBlockDuration(
      "2026-01-05T17:00:00.000Z",
      "2026-01-05T15:00:00.000Z",
      workingHours,
      tz
    )).toBe(0);

    expect(computeBlockDuration(
      "2026-01-05T15:00:00.000Z",
      "2026-01-05T15:00:00.000Z",
      workingHours,
      tz
    )).toBe(0);
  });
});

describe("getEndOfWorkDay", () => {
  const workingHours = makeWorkingHours();
  const tz = "America/New_York";

  it("returns UTC Date for 5pm ET on a working day", () => {
    const result = getEndOfWorkDay("2026-01-05T14:00:00.000Z", workingHours, tz);
    expect(result).toEqual(new Date("2026-01-05T22:00:00.000Z"));
  });

  it("returns null for a non-working day", () => {
    const result = getEndOfWorkDay("2026-01-10T14:00:00.000Z", workingHours, tz);
    expect(result).toBeNull();
  });
});

describe("getStartOfWorkDay", () => {
  const workingHours = makeWorkingHours();
  const tz = "America/New_York";

  it("returns UTC Date for 9am ET on a working day", () => {
    const result = getStartOfWorkDay("2026-01-05T14:00:00.000Z", workingHours, tz);
    expect(result).toEqual(new Date("2026-01-05T14:00:00.000Z"));
  });

  it("returns null for a non-working day", () => {
    const result = getStartOfWorkDay("2026-01-10T14:00:00.000Z", workingHours, tz);
    expect(result).toBeNull();
  });
});
