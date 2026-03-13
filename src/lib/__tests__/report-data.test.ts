import { describe, it, expect, vi } from "vitest";

vi.mock("@/db/index", () => ({ db: {} }));
vi.mock("@/db/tables", () => ({
  activities: {},
  preferences: {},
  sprintGoalSnapshots: {},
  prioritySnapshots: {},
  sprints: {},
}));
vi.mock("@/db/helpers", () => ({
  first: vi.fn(),
  all: vi.fn(),
}));

import {
  computeOnCallMetrics,
  assembleReportPayload,
} from "@/lib/report-data";
import { makeActivity } from "./helpers";

describe("computeOnCallMetrics", () => {
  it("returns zeros when no activities are on-call", () => {
    const items = [
      makeActivity({ onCallAtTime: false, durationMinutes: 30 }),
      makeActivity({ onCallAtTime: false, durationMinutes: 20 }),
    ];
    const result = computeOnCallMetrics(items, "CALL");
    expect(result).toEqual({ onCallMinutes: 0, onCallTicketMinutes: 0 });
  });

  it("excludes break activities from onCallMinutes", () => {
    const items = [
      makeActivity({
        classification: "break",
        onCallAtTime: true,
        durationMinutes: 15,
      }),
    ];
    const result = computeOnCallMetrics(items, "CALL");
    expect(result.onCallMinutes).toBe(0);
  });

  it("sums onCallMinutes for non-break on-call activities", () => {
    const items = [
      makeActivity({
        classification: "green",
        onCallAtTime: true,
        durationMinutes: 20,
      }),
      makeActivity({
        classification: "red",
        onCallAtTime: true,
        durationMinutes: 10,
      }),
      makeActivity({
        classification: "yellow",
        onCallAtTime: false,
        durationMinutes: 40,
      }),
    ];
    const result = computeOnCallMetrics(items, "CALL");
    expect(result.onCallMinutes).toBe(30);
  });

  it("matches ticket prefix with dash separator", () => {
    const items = [
      makeActivity({
        tickets: ["CALL-42"],
        durationMinutes: 25,
      }),
    ];
    const result = computeOnCallMetrics(items, "CALL");
    expect(result.onCallTicketMinutes).toBe(25);
  });

  it("does not match ticket without dash separator", () => {
    const items = [
      makeActivity({
        tickets: ["CALLBACK-1"],
        durationMinutes: 25,
      }),
    ];
    const result = computeOnCallMetrics(items, "CALL");
    expect(result.onCallTicketMinutes).toBe(0);
  });

  it("matches ticket prefix case-insensitively", () => {
    const items = [
      makeActivity({
        tickets: ["call-99"],
        durationMinutes: 15,
      }),
    ];
    const result = computeOnCallMetrics(items, "CALL");
    expect(result.onCallTicketMinutes).toBe(15);

    const result2 = computeOnCallMetrics(items, "call");
    expect(result2.onCallTicketMinutes).toBe(15);
  });
});

describe("assembleReportPayload", () => {
  it("computes metrics, goalProgress, and on-call for mixed activities", () => {
    const activities = [
      makeActivity({
        id: 1,
        timestamp: "2026-01-05T10:00:00.000Z",
        text: "Sprint work",
        tickets: ["PROJ-1"],
        classification: "green",
        onCallAtTime: false,
        durationMinutes: 60,
      }),
      makeActivity({
        id: 2,
        timestamp: "2026-01-05T11:00:00.000Z",
        text: "More sprint work",
        tickets: ["PROJ-1"],
        classification: "green",
        onCallAtTime: true,
        durationMinutes: 30,
      }),
      makeActivity({
        id: 3,
        timestamp: "2026-01-05T11:30:00.000Z",
        text: "Interruption",
        tickets: ["ONCALL-5"],
        classification: "red",
        onCallAtTime: true,
        durationMinutes: 20,
      }),
    ];

    const result = assembleReportPayload({
      activities,
      tz: "UTC",
      onCallPrefix: "ONCALL",
      sprintGoals: ["PROJ-1", "PROJ-2"],
      goalChangeCount: 2,
      priorityChangeCount: 1,
    });

    expect(result.totalMinutes).toBe(110);
    expect(result.greenMinutes).toBe(90);
    expect(result.redMinutes).toBe(20);

    expect(result.goalChangeCount).toBe(2);
    expect(result.priorityChangeCount).toBe(1);

    expect(result.onCallMinutes).toBe(50);
    expect(result.onCallTicketMinutes).toBe(20);

    expect(result.goalProgress).toEqual([
      { goal: "PROJ-1", minutes: 90 },
      { goal: "PROJ-2", minutes: 0 },
    ]);
  });

  it("returns all zeros for empty activities", () => {
    const result = assembleReportPayload({
      activities: [],
      tz: "UTC",
      onCallPrefix: "CALL",
      sprintGoals: [],
      goalChangeCount: 0,
      priorityChangeCount: 0,
    });

    expect(result.totalMinutes).toBe(0);
    expect(result.greenMinutes).toBe(0);
    expect(result.yellowMinutes).toBe(0);
    expect(result.redMinutes).toBe(0);
    expect(result.breakMinutes).toBe(0);
    expect(result.onCallMinutes).toBe(0);
    expect(result.onCallTicketMinutes).toBe(0);
    expect(result.goalProgress).toEqual([]);
    expect(result.goalChangeCount).toBe(0);
    expect(result.priorityChangeCount).toBe(0);
  });

  it("returns zero minutes for a goal with no matching tickets", () => {
    const activities = [
      makeActivity({
        tickets: ["PROJ-1"],
        durationMinutes: 45,
      }),
    ];

    const result = assembleReportPayload({
      activities,
      tz: "UTC",
      onCallPrefix: "CALL",
      sprintGoals: ["NOMATCH-1"],
      goalChangeCount: 0,
      priorityChangeCount: 0,
    });

    expect(result.goalProgress).toEqual([
      { goal: "NOMATCH-1", minutes: 0 },
    ]);
  });
});
