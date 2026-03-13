import { describe, it, expect } from "vitest";
import { computeMetrics, formatMinutes, formatPct } from "@/lib/metrics";
import { makeActivity } from "./helpers";

describe("formatMinutes", () => {
  it("returns '< 1m' for sub-minute values", () => {
    expect(formatMinutes(0.5)).toBe("< 1m");
    expect(formatMinutes(0)).toBe("< 1m");
  });

  it("returns minutes only for values under 60", () => {
    expect(formatMinutes(5)).toBe("5m");
  });

  it("returns hours and minutes for 60+", () => {
    expect(formatMinutes(65)).toBe("1h 5m");
    expect(formatMinutes(120)).toBe("2h 0m");
  });

  it("rounds the minutes portion", () => {
    expect(formatMinutes(90.4)).toBe("1h 30m");
  });
});

describe("formatPct", () => {
  it("rounds to nearest integer and appends %", () => {
    expect(formatPct(33.333)).toBe("33%");
    expect(formatPct(0)).toBe("0%");
    expect(formatPct(100)).toBe("100%");
  });
});

describe("computeMetrics", () => {
  const TZ = "UTC";

  it("scenario 1: empty array returns zeroed metrics", () => {
    const result = computeMetrics([], TZ);

    expect(result.totalMinutes).toBe(0);
    expect(result.breakMinutes).toBe(0);
    expect(result.greenMinutes).toBe(0);
    expect(result.yellowMinutes).toBe(0);
    expect(result.redMinutes).toBe(0);
    expect(result.greenPct).toBe(0);
    expect(result.yellowPct).toBe(0);
    expect(result.redPct).toBe(0);
    expect(result.totalContextSwitches).toBe(0);
    expect(result.meanFocusTime).toBe(0);
    expect(result.longestBlock).toBe(0);
    expect(result.perActivity).toEqual([]);
    expect(result.perTicket).toEqual([]);
    expect(result.perPerson).toEqual([]);
    expect(result.dailyBreakdown).toEqual([]);
  });

  it("scenario 2: single green activity", () => {
    const activity = makeActivity({ durationMinutes: 45 });
    const result = computeMetrics([activity], TZ);

    expect(result.totalMinutes).toBe(45);
    expect(result.greenPct).toBe(100);
    expect(result.yellowPct).toBe(0);
    expect(result.redPct).toBe(0);
    expect(result.totalContextSwitches).toBe(0);
    expect(result.perActivity).toHaveLength(1);
    expect(result.dailyBreakdown).toHaveLength(1);
  });

  it("scenario 3: mixed activities across 2 UTC days", () => {
    const activities = [
      makeActivity({
        id: 1,
        timestamp: "2026-01-05T10:00:00.000Z",
        text: "Code review for PROJ-1",
        tickets: ["PROJ-1"],
        tags: ["@Alice"],
        classification: "green",
        durationMinutes: 30,
      }),
      makeActivity({
        id: 2,
        timestamp: "2026-01-05T11:00:00.000Z",
        text: "Code review for PROJ-1",
        tickets: ["PROJ-1"],
        tags: ["@Alice"],
        classification: "green",
        durationMinutes: 20,
      }),
      makeActivity({
        id: 3,
        timestamp: "2026-01-05T14:00:00.000Z",
        text: "Helping Bob with PROJ-2",
        tickets: ["PROJ-2"],
        tags: ["@Bob"],
        classification: "yellow",
        durationMinutes: 45,
      }),
      makeActivity({
        id: 4,
        timestamp: "2026-01-06T09:00:00.000Z",
        text: "Incident PROJ-3",
        tickets: ["PROJ-1", "PROJ-3"],
        tags: [],
        classification: "red",
        durationMinutes: 15,
      }),
      makeActivity({
        id: 5,
        timestamp: "2026-01-06T10:00:00.000Z",
        text: "Coffee break",
        tickets: [],
        tags: [],
        classification: "break",
        durationMinutes: 10,
      }),
    ];

    const result = computeMetrics(activities, TZ);

    expect(result.greenMinutes).toBe(50);
    expect(result.yellowMinutes).toBe(45);
    expect(result.redMinutes).toBe(15);
    expect(result.breakMinutes).toBe(10);
    expect(result.totalMinutes).toBe(110);

    expect(result.greenPct).toBeCloseTo(45.45, 1);
    expect(result.yellowPct).toBeCloseTo(40.91, 1);
    expect(result.redPct).toBeCloseTo(13.64, 1);

    expect(result.totalContextSwitches).toBe(2);
    expect(result.meanTimeBetweenSwitches).toBe(55);

    expect(result.perActivity).toEqual([
      { text: "Code review for PROJ-1", minutes: 50 },
      { text: "Helping Bob with PROJ-2", minutes: 45 },
      { text: "Incident PROJ-3", minutes: 15 },
    ]);

    expect(result.perTicket).toEqual([
      { ticket: "PROJ-1", minutes: 65 },
      { ticket: "PROJ-2", minutes: 45 },
      { ticket: "PROJ-3", minutes: 15 },
    ]);

    expect(result.perPerson).toHaveLength(2);
    const alice = result.perPerson.find((p) => p.person === "@alice");
    const bob = result.perPerson.find((p) => p.person === "@bob");
    expect(alice).toEqual({
      person: "@alice",
      minutes: 50,
      switchCount: 0,
      greenMinutes: 50,
      yellowMinutes: 0,
      redMinutes: 0,
    });
    expect(bob).toEqual({
      person: "@bob",
      minutes: 45,
      switchCount: 1,
      greenMinutes: 0,
      yellowMinutes: 45,
      redMinutes: 0,
    });

    expect(result.dailyBreakdown).toHaveLength(2);
    expect(result.dailyBreakdown[0].date).toBe("2026-01-05");
    expect(result.dailyBreakdown[1].date).toBe("2026-01-06");

    const day1 = result.dailyBreakdown[0];
    expect(day1.totalMinutes).toBe(95);
    expect(day1.greenMinutes).toBe(50);
    expect(day1.yellowMinutes).toBe(45);
    expect(day1.redMinutes).toBe(0);
    expect(day1.contextSwitches).toBe(2);

    const day2 = result.dailyBreakdown[1];
    expect(day2.totalMinutes).toBe(15);
    expect(day2.breakMinutes).toBe(10);
    expect(day2.contextSwitches).toBe(0);
  });

  it("scenario 4: focus blocks with breaks", () => {
    const baseDate = "2026-01-05";
    const activities = [
      makeActivity({
        id: 1,
        timestamp: `${baseDate}T09:00:00.000Z`,
        text: "Task A",
        tickets: [],
        tags: [],
        classification: "green",
        durationMinutes: 30,
      }),
      makeActivity({
        id: 2,
        timestamp: `${baseDate}T09:30:00.000Z`,
        text: "Task A continued",
        tickets: [],
        tags: [],
        classification: "green",
        durationMinutes: 30,
      }),
      makeActivity({
        id: 3,
        timestamp: `${baseDate}T10:00:00.000Z`,
        text: "Lunch",
        tickets: [],
        tags: [],
        classification: "break",
        durationMinutes: 15,
      }),
      makeActivity({
        id: 4,
        timestamp: `${baseDate}T10:15:00.000Z`,
        text: "Incident X",
        tickets: [],
        tags: [],
        classification: "red",
        durationMinutes: 20,
      }),
      makeActivity({
        id: 5,
        timestamp: `${baseDate}T10:35:00.000Z`,
        text: "Incident X follow-up",
        tickets: [],
        tags: [],
        classification: "red",
        durationMinutes: 20,
      }),
      makeActivity({
        id: 6,
        timestamp: `${baseDate}T10:55:00.000Z`,
        text: "Back to planned work",
        tickets: [],
        tags: [],
        classification: "green",
        durationMinutes: 25,
      }),
    ];

    const result = computeMetrics(activities, TZ);

    expect(result.meanFocusTime).toBeCloseTo(41.67, 1);
    expect(result.longestBlock).toBe(60);
    expect(result.longestGreenBlock).toBe(60);
    expect(result.longestRedBlock).toBe(40);
    expect(result.meanGreenFocus).toBe(42.5);
    expect(result.meanRedFocus).toBe(40);
  });

  it("scenario 5: break-only activities", () => {
    const activities = [
      makeActivity({
        id: 1,
        timestamp: "2026-01-05T12:00:00.000Z",
        text: "Lunch",
        tickets: [],
        tags: [],
        classification: "break",
        durationMinutes: 30,
      }),
      makeActivity({
        id: 2,
        timestamp: "2026-01-05T15:00:00.000Z",
        text: "Coffee",
        tickets: [],
        tags: [],
        classification: "break",
        durationMinutes: 15,
      }),
    ];

    const result = computeMetrics(activities, TZ);

    expect(result.totalMinutes).toBe(0);
    expect(result.breakMinutes).toBe(45);
    expect(result.greenPct).toBe(0);
    expect(result.yellowPct).toBe(0);
    expect(result.redPct).toBe(0);
    expect(result.perActivity).toEqual([]);
    expect(result.perTicket).toEqual([]);
    expect(result.perPerson).toEqual([]);
  });
});
