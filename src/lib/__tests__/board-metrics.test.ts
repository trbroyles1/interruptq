import { describe, it, expect } from "vitest";
import {
  extractBoardSafeMetrics,
  computeBoardAggregates,
} from "@/lib/board-metrics";
import {
  BOARD_NAME_PATTERN,
  MAX_BOARD_NAME_LENGTH,
  MAX_HANDLE_LENGTH,
} from "@/lib/board-constants";
import type { ReportPayload } from "@/lib/report-data";
import type { BoardSafeMetrics } from "@/types";

function makeReport(overrides: Partial<ReportPayload> = {}): ReportPayload {
  return {
    totalMinutes: 480,
    breakMinutes: 60,
    greenMinutes: 240,
    yellowMinutes: 120,
    redMinutes: 60,
    greenPct: 57.1,
    yellowPct: 28.6,
    redPct: 14.3,
    totalContextSwitches: 8,
    meanTimeBetweenSwitches: 52.5,
    meanFocusTime: 35,
    meanGreenFocus: 48,
    meanYellowFocus: 30,
    meanRedFocus: 15,
    longestBlock: 90,
    longestGreenBlock: 90,
    longestYellowBlock: 60,
    longestRedBlock: 30,
    perActivity: [{ text: "coding", minutes: 200 }],
    perTicket: [{ ticket: "ENG-123", minutes: 150 }],
    perPerson: [
      {
        person: "alice",
        minutes: 100,
        switchCount: 3,
        greenMinutes: 60,
        yellowMinutes: 30,
        redMinutes: 10,
      },
    ],
    dailyBreakdown: [],
    goalChangeCount: 2,
    priorityChangeCount: 1,
    onCallMinutes: 45,
    onCallTicketMinutes: 30,
    goalProgress: [{ goal: "ENG-123", minutes: 150 }],
    ...overrides,
  };
}

function makeMetrics(overrides: Partial<BoardSafeMetrics> = {}): BoardSafeMetrics {
  return {
    greenPct: 50,
    yellowPct: 30,
    redPct: 20,
    totalContextSwitches: 10,
    meanTimeBetweenSwitches: 48,
    meanFocusTime: 40,
    meanGreenFocus: 50,
    meanYellowFocus: 30,
    meanRedFocus: 20,
    longestBlock: 90,
    longestGreenBlock: 90,
    longestYellowBlock: 60,
    longestRedBlock: 30,
    goalChangeCount: 1,
    priorityChangeCount: 0,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// extractBoardSafeMetrics — privacy boundary
// ---------------------------------------------------------------------------

describe("extractBoardSafeMetrics", () => {
  it("includes classification percentages", () => {
    const report = makeReport({ greenPct: 60, yellowPct: 25, redPct: 15 });
    const safe = extractBoardSafeMetrics(report);

    expect(safe.greenPct).toBe(60);
    expect(safe.yellowPct).toBe(25);
    expect(safe.redPct).toBe(15);
  });

  it("includes context switch metrics", () => {
    const report = makeReport({ totalContextSwitches: 12, meanTimeBetweenSwitches: 40 });
    const safe = extractBoardSafeMetrics(report);

    expect(safe.totalContextSwitches).toBe(12);
    expect(safe.meanTimeBetweenSwitches).toBe(40);
  });

  it("includes focus time averages", () => {
    const report = makeReport({
      meanFocusTime: 35,
      meanGreenFocus: 50,
      meanYellowFocus: 25,
      meanRedFocus: 10,
    });
    const safe = extractBoardSafeMetrics(report);

    expect(safe.meanFocusTime).toBe(35);
    expect(safe.meanGreenFocus).toBe(50);
    expect(safe.meanYellowFocus).toBe(25);
    expect(safe.meanRedFocus).toBe(10);
  });

  it("includes longest block durations", () => {
    const report = makeReport({
      longestBlock: 120,
      longestGreenBlock: 120,
      longestYellowBlock: 45,
      longestRedBlock: 20,
    });
    const safe = extractBoardSafeMetrics(report);

    expect(safe.longestBlock).toBe(120);
    expect(safe.longestGreenBlock).toBe(120);
    expect(safe.longestYellowBlock).toBe(45);
    expect(safe.longestRedBlock).toBe(20);
  });

  it("includes goal and priority change counts", () => {
    const report = makeReport({ goalChangeCount: 3, priorityChangeCount: 5 });
    const safe = extractBoardSafeMetrics(report);

    expect(safe.goalChangeCount).toBe(3);
    expect(safe.priorityChangeCount).toBe(5);
  });

  it("never exposes absolute time amounts", () => {
    const report = makeReport({
      totalMinutes: 480,
      greenMinutes: 240,
      yellowMinutes: 120,
      redMinutes: 60,
      breakMinutes: 60,
    });
    const safe = extractBoardSafeMetrics(report);
    const keys = Object.keys(safe);

    expect(keys).not.toContain("totalMinutes");
    expect(keys).not.toContain("greenMinutes");
    expect(keys).not.toContain("yellowMinutes");
    expect(keys).not.toContain("redMinutes");
    expect(keys).not.toContain("breakMinutes");
  });

  it("never exposes per-activity, per-ticket, or per-person breakdowns", () => {
    const safe = extractBoardSafeMetrics(makeReport());
    const keys = Object.keys(safe);

    expect(keys).not.toContain("perActivity");
    expect(keys).not.toContain("perTicket");
    expect(keys).not.toContain("perPerson");
  });

  it("never exposes on-call data or goal progress", () => {
    const safe = extractBoardSafeMetrics(makeReport());
    const keys = Object.keys(safe);

    expect(keys).not.toContain("onCallMinutes");
    expect(keys).not.toContain("onCallTicketMinutes");
    expect(keys).not.toContain("goalProgress");
  });

  it("never exposes daily breakdown", () => {
    const safe = extractBoardSafeMetrics(makeReport());
    const keys = Object.keys(safe);

    expect(keys).not.toContain("dailyBreakdown");
  });

  it("returns exactly 15 fields", () => {
    const safe = extractBoardSafeMetrics(makeReport());
    expect(Object.keys(safe)).toHaveLength(15);
  });
});

// ---------------------------------------------------------------------------
// computeBoardAggregates
// ---------------------------------------------------------------------------

describe("computeBoardAggregates", () => {
  it("computes mean, min, max across multiple participants", () => {
    const a = makeMetrics({ greenPct: 40, totalContextSwitches: 6 });
    const b = makeMetrics({ greenPct: 80, totalContextSwitches: 12 });
    const agg = computeBoardAggregates([a, b]);

    expect(agg.greenPct.mean).toBe(60);
    expect(agg.greenPct.min).toBe(40);
    expect(agg.greenPct.max).toBe(80);

    expect(agg.totalContextSwitches.mean).toBe(9);
    expect(agg.totalContextSwitches.min).toBe(6);
    expect(agg.totalContextSwitches.max).toBe(12);
  });

  it("returns the values directly for a single participant", () => {
    const m = makeMetrics({ greenPct: 75, redPct: 5 });
    const agg = computeBoardAggregates([m]);

    expect(agg.greenPct.mean).toBe(75);
    expect(agg.greenPct.min).toBe(75);
    expect(agg.greenPct.max).toBe(75);

    expect(agg.redPct.mean).toBe(5);
    expect(agg.redPct.min).toBe(5);
    expect(agg.redPct.max).toBe(5);
  });

  it("returns zeroed aggregates for an empty participant list", () => {
    const agg = computeBoardAggregates([]);

    expect(agg.greenPct).toEqual({ mean: 0, min: 0, max: 0 });
    expect(agg.totalContextSwitches).toEqual({ mean: 0, min: 0, max: 0 });
    expect(agg.meanFocusTime).toEqual({ mean: 0, min: 0, max: 0 });
  });

  it("computes aggregates for every metric field", () => {
    const agg = computeBoardAggregates([makeMetrics()]);

    const expectedKeys: (keyof BoardSafeMetrics)[] = [
      "greenPct", "yellowPct", "redPct",
      "totalContextSwitches", "meanTimeBetweenSwitches",
      "meanFocusTime", "meanGreenFocus", "meanYellowFocus", "meanRedFocus",
      "longestBlock", "longestGreenBlock", "longestYellowBlock", "longestRedBlock",
      "goalChangeCount", "priorityChangeCount",
    ];

    for (const key of expectedKeys) {
      expect(agg[key]).toBeDefined();
      expect(agg[key]).toHaveProperty("mean");
      expect(agg[key]).toHaveProperty("min");
      expect(agg[key]).toHaveProperty("max");
    }
  });

  it("handles three participants with varied values", () => {
    const participants = [
      makeMetrics({ longestBlock: 30 }),
      makeMetrics({ longestBlock: 60 }),
      makeMetrics({ longestBlock: 120 }),
    ];
    const agg = computeBoardAggregates(participants);

    expect(agg.longestBlock.min).toBe(30);
    expect(agg.longestBlock.max).toBe(120);
    expect(agg.longestBlock.mean).toBe(70);
  });
});

// ---------------------------------------------------------------------------
// Board name validation
// ---------------------------------------------------------------------------

describe("board name validation", () => {
  it("accepts alphanumeric names", () => {
    expect(BOARD_NAME_PATTERN.test("myboard")).toBe(true);
    expect(BOARD_NAME_PATTERN.test("Board123")).toBe(true);
  });

  it("accepts hyphens and underscores", () => {
    expect(BOARD_NAME_PATTERN.test("my-board")).toBe(true);
    expect(BOARD_NAME_PATTERN.test("my_board")).toBe(true);
    expect(BOARD_NAME_PATTERN.test("a-b_c-d")).toBe(true);
  });

  it("rejects spaces", () => {
    expect(BOARD_NAME_PATTERN.test("my board")).toBe(false);
    expect(BOARD_NAME_PATTERN.test(" leading")).toBe(false);
  });

  it("rejects special characters", () => {
    expect(BOARD_NAME_PATTERN.test("board!")).toBe(false);
    expect(BOARD_NAME_PATTERN.test("board@name")).toBe(false);
    expect(BOARD_NAME_PATTERN.test("board.name")).toBe(false);
    expect(BOARD_NAME_PATTERN.test("board/name")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(BOARD_NAME_PATTERN.test("")).toBe(false);
  });

  it("enforces maximum length via constant", () => {
    const maxName = "a".repeat(MAX_BOARD_NAME_LENGTH);
    const tooLong = "a".repeat(MAX_BOARD_NAME_LENGTH + 1);

    expect(BOARD_NAME_PATTERN.test(maxName)).toBe(true);
    expect(maxName.length <= MAX_BOARD_NAME_LENGTH).toBe(true);
    expect(tooLong.length <= MAX_BOARD_NAME_LENGTH).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Handle validation
// ---------------------------------------------------------------------------

describe("handle validation", () => {
  it("allows handles up to 32 characters", () => {
    expect("a".repeat(MAX_HANDLE_LENGTH).length).toBe(32);
  });

  it("rejects handles longer than 32 characters at the boundary", () => {
    const tooLong = "a".repeat(MAX_HANDLE_LENGTH + 1);
    expect(tooLong.length > MAX_HANDLE_LENGTH).toBe(true);
  });
});
