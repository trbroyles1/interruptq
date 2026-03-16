import { describe, it, expect } from "vitest";
import {
  TOUR_STEPS,
  TOUR_ID_ACTIVITY_INPUT,
  TOUR_ID_SPRINT_GOALS,
  TOUR_ID_PRIORITIES,
  TOUR_ID_SPRINT_PANEL,
  TOUR_ID_QUICK_PICK,
  TOUR_ID_ON_CALL,
  TOUR_ID_BREAK,
  TOUR_ID_VIEW_TABS,
  TOUR_ID_SHARE,
  TOUR_ID_PREFERENCES,
  TOUR_ID_BOARDS,
} from "../tour-steps";

const ALL_IDS = [
  TOUR_ID_ACTIVITY_INPUT,
  TOUR_ID_SPRINT_GOALS,
  TOUR_ID_PRIORITIES,
  TOUR_ID_SPRINT_PANEL,
  TOUR_ID_QUICK_PICK,
  TOUR_ID_ON_CALL,
  TOUR_ID_BREAK,
  TOUR_ID_VIEW_TABS,
  TOUR_ID_SHARE,
  TOUR_ID_PREFERENCES,
  TOUR_ID_BOARDS,
];

describe("tour-steps", () => {
  it("defines exactly 11 tour steps", () => {
    expect(TOUR_STEPS).toHaveLength(11);
  });

  it("has no duplicate element selectors", () => {
    const selectors = TOUR_STEPS.map((s) => s.element);
    expect(new Set(selectors).size).toBe(selectors.length);
  });

  it("every step targets a valid ID constant with a # selector", () => {
    for (const step of TOUR_STEPS) {
      expect(step.element).toMatch(/^#[a-z-]+$/);
    }
  });

  it("every step has a popover with title and description", () => {
    for (const step of TOUR_STEPS) {
      expect(step.popover).toBeDefined();
      expect(step.popover!.title).toBeTruthy();
      expect(step.popover!.description).toBeTruthy();
    }
  });

  it("every ID constant is referenced by exactly one step", () => {
    const selectors = TOUR_STEPS.map((s) => s.element);
    for (const id of ALL_IDS) {
      expect(selectors).toContain(`#${id}`);
    }
  });

  it("steps follow the expected order", () => {
    const expectedOrder = [
      TOUR_ID_ACTIVITY_INPUT,
      TOUR_ID_SPRINT_GOALS,
      TOUR_ID_PRIORITIES,
      TOUR_ID_SPRINT_PANEL,
      TOUR_ID_QUICK_PICK,
      TOUR_ID_ON_CALL,
      TOUR_ID_BREAK,
      TOUR_ID_VIEW_TABS,
      TOUR_ID_SHARE,
      TOUR_ID_PREFERENCES,
      TOUR_ID_BOARDS,
    ];
    const actualOrder = TOUR_STEPS.map((s) =>
      (s.element as string).replace("#", ""),
    );
    expect(actualOrder).toEqual(expectedOrder);
  });
});
