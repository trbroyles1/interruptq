import { describe, it, expect } from "vitest";
import { classify } from "../classify";

const DEFAULT_INPUT = {
  entryText: "Working on PROJ-1",
  entryTickets: ["PROJ-1"],
  isOnCall: false,
  onCallPrefix: "ONCALL",
  sprintGoals: [] as string[],
  priorities: [] as { type: "ticket" | "text"; value: string }[],
};

function classifyWith(overrides: Partial<typeof DEFAULT_INPUT>) {
  return classify({ ...DEFAULT_INPUT, ...overrides });
}

describe("classify (not on-call)", () => {
  it("returns green when entry matches a sprint goal ticket", () => {
    expect(classifyWith({ sprintGoals: ["PROJ-1"] })).toBe("green");
  });

  it("returns yellow when entry matches a ticket-type priority", () => {
    expect(
      classifyWith({
        entryText: "Working on PRI-5",
        entryTickets: ["PRI-5"],
        priorities: [{ type: "ticket", value: "PRI-5" }],
      }),
    ).toBe("yellow");
  });

  it("returns yellow when entry matches a free-text priority", () => {
    expect(
      classifyWith({
        entryText: "Code review",
        entryTickets: [],
        priorities: [{ type: "text", value: "Code review" }],
      }),
    ).toBe("yellow");
  });

  it("returns green when entry matches both a goal and a priority (goal wins)", () => {
    expect(
      classifyWith({
        sprintGoals: ["PROJ-1"],
        priorities: [{ type: "ticket", value: "PROJ-1" }],
      }),
    ).toBe("green");
  });

  it("returns red when entry matches nothing", () => {
    expect(
      classifyWith({
        entryText: "random distraction",
        entryTickets: [],
      }),
    ).toBe("red");
  });

  it("returns red with empty goals and empty priorities", () => {
    expect(
      classifyWith({
        sprintGoals: [],
        priorities: [],
      }),
    ).toBe("red");
  });
});

describe("classify (on-call)", () => {
  it("returns green when entry matches an on-call prefix ticket", () => {
    expect(
      classifyWith({
        isOnCall: true,
        entryText: "Handling ONCALL-99",
        entryTickets: ["ONCALL-99"],
      }),
    ).toBe("green");
  });

  it("matches on-call prefix case-insensitively", () => {
    expect(
      classifyWith({
        isOnCall: true,
        onCallPrefix: "oncall",
        entryText: "Handling ONCALL-99",
        entryTickets: ["ONCALL-99"],
      }),
    ).toBe("green");
  });

  it("returns yellow when entry matches a sprint goal while on-call (demoted)", () => {
    expect(
      classifyWith({
        isOnCall: true,
        sprintGoals: ["PROJ-1"],
      }),
    ).toBe("yellow");
  });

  it("returns yellow when entry matches a priority while on-call", () => {
    expect(
      classifyWith({
        isOnCall: true,
        entryText: "Working on PRI-5",
        entryTickets: ["PRI-5"],
        priorities: [{ type: "ticket", value: "PRI-5" }],
      }),
    ).toBe("yellow");
  });

  it("returns red when nothing matches while on-call", () => {
    expect(
      classifyWith({
        isOnCall: true,
        entryText: "random distraction",
        entryTickets: [],
      }),
    ).toBe("red");
  });
});
