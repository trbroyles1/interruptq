import { describe, it, expect } from "vitest";
import { generateTextExport } from "@/lib/export-text";
import type { RangeMetrics } from "@/lib/metrics";
import { makeActivity } from "./helpers";

function makeBaseMetrics(overrides?: Partial<RangeMetrics>): RangeMetrics {
  return {
    totalMinutes: 0,
    breakMinutes: 0,
    greenMinutes: 0,
    yellowMinutes: 0,
    redMinutes: 0,
    greenPct: 0,
    yellowPct: 0,
    redPct: 0,
    totalContextSwitches: 0,
    meanTimeBetweenSwitches: 0,
    meanFocusTime: 0,
    meanGreenFocus: 0,
    meanYellowFocus: 0,
    meanRedFocus: 0,
    longestBlock: 0,
    longestGreenBlock: 0,
    longestYellowBlock: 0,
    longestRedBlock: 0,
    perActivity: [],
    perTicket: [],
    perPerson: [],
    dailyBreakdown: [],
    ...overrides,
  };
}

describe("generateTextExport", () => {
  it("case 1: full data with all optional fields present", () => {
    const data = {
      ...makeBaseMetrics({
        totalMinutes: 480,
        greenMinutes: 300,
        yellowMinutes: 120,
        redMinutes: 60,
        greenPct: 62.5,
        yellowPct: 25,
        redPct: 12.5,
        breakMinutes: 30,
        totalContextSwitches: 8,
        meanTimeBetweenSwitches: 60,
        meanFocusTime: 45,
        meanGreenFocus: 50,
        meanYellowFocus: 30,
        meanRedFocus: 20,
        longestBlock: 90,
        longestGreenBlock: 90,
        longestYellowBlock: 60,
        longestRedBlock: 30,
        perActivity: [
          { text: "Feature work", minutes: 200 },
          { text: "Meetings", minutes: 100 },
        ],
        perTicket: [{ ticket: "PROJ-1", minutes: 300 }],
        perPerson: [
          {
            person: "@alice",
            minutes: 120,
            switchCount: 3,
            greenMinutes: 80,
            yellowMinutes: 40,
            redMinutes: 0,
          },
        ],
        dailyBreakdown: [
          {
            date: "2026-01-05",
            totalMinutes: 240,
            breakMinutes: 15,
            greenMinutes: 150,
            yellowMinutes: 60,
            redMinutes: 30,
            contextSwitches: 4,
            activities: [makeActivity()],
          },
          {
            date: "2026-01-06",
            totalMinutes: 240,
            breakMinutes: 15,
            greenMinutes: 150,
            yellowMinutes: 60,
            redMinutes: 30,
            contextSwitches: 4,
            activities: [makeActivity({ id: 2 })],
          },
        ],
      }),
      from: "2026-01-05",
      to: "2026-01-06",
      goalChangeCount: 2,
      priorityChangeCount: 3,
      onCallMinutes: 60,
      onCallTicketMinutes: 30,
      goalProgress: [
        { goal: "Ship v2", minutes: 200 },
        { goal: "Reduce tech debt", minutes: 100 },
      ],
    };

    const output = generateTextExport(data);

    expect(output).toContain("TIME BREAKDOWN");
    expect(output).toContain("CONTEXT SWITCHES");
    expect(output).toContain("Daily avg");
    expect(output).toContain("MEAN FOCUS TIME");
    expect(output).toContain("TOP ACTIVITIES");
    expect(output).toContain("TIME BY PERSON");
    expect(output).toContain("SPRINT GOAL PROGRESS");
    expect(output).toContain("ON-CALL");
    expect(output).toContain("PRIORITY DRIFT");
  });

  it("case 2: minimal data omits optional sections", () => {
    const data = {
      ...makeBaseMetrics(),
      from: "",
      to: "",
    };

    const output = generateTextExport(data);

    expect(output).not.toContain("SPRINT GOAL PROGRESS");
    expect(output).not.toContain("ON-CALL");
    expect(output).not.toContain("PRIORITY DRIFT");
    expect(output).not.toContain("Daily avg");
  });

  it("case 3: onCallMinutes = 0 omits ON-CALL section", () => {
    const data = {
      ...makeBaseMetrics({
        dailyBreakdown: [
          {
            date: "2026-01-05",
            totalMinutes: 60,
            breakMinutes: 0,
            greenMinutes: 60,
            yellowMinutes: 0,
            redMinutes: 0,
            contextSwitches: 0,
            activities: [makeActivity()],
          },
          {
            date: "2026-01-06",
            totalMinutes: 60,
            breakMinutes: 0,
            greenMinutes: 60,
            yellowMinutes: 0,
            redMinutes: 0,
            contextSwitches: 0,
            activities: [makeActivity({ id: 2 })],
          },
        ],
      }),
      from: "2026-01-05",
      to: "2026-01-06",
      goalChangeCount: 1,
      priorityChangeCount: 0,
      onCallMinutes: 0,
      goalProgress: [{ goal: "Ship v2", minutes: 30 }],
    };

    const output = generateTextExport(data);

    expect(output).not.toContain("ON-CALL");
    expect(output).toContain("SPRINT GOAL PROGRESS");
    expect(output).toContain("PRIORITY DRIFT");
  });

  it("case 4: single day in dailyBreakdown omits Daily avg", () => {
    const data = {
      ...makeBaseMetrics({
        totalContextSwitches: 3,
        meanTimeBetweenSwitches: 20,
        dailyBreakdown: [
          {
            date: "2026-01-05",
            totalMinutes: 60,
            breakMinutes: 0,
            greenMinutes: 60,
            yellowMinutes: 0,
            redMinutes: 0,
            contextSwitches: 3,
            activities: [makeActivity()],
          },
        ],
      }),
      from: "2026-01-05",
      to: "2026-01-05",
    };

    const output = generateTextExport(data);

    expect(output).toContain("CONTEXT SWITCHES");
    expect(output).not.toContain("Daily avg");
  });
});
