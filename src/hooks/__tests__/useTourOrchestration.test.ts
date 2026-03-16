// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTourOrchestration } from "../useTourOrchestration";

const mockStartTour = vi.fn();
let capturedOnComplete: (() => void) | undefined;

vi.mock("@/hooks/useOnboardingTour", () => ({
  useOnboardingTour: vi.fn((opts?: { onComplete?: () => void }) => {
    capturedOnComplete = opts?.onComplete;
    return { startTour: mockStartTour };
  }),
}));

vi.mock("driver.js/dist/driver.css", () => ({}));
vi.mock("@/components/onboarding/tour-theme.css", () => ({}));

function createOptions(overrides: { tourCompleted?: boolean | undefined } = {}) {
  return {
    tourCompleted: overrides.tourCompleted,
    updatePreferences: vi.fn(() => Promise.resolve()),
    beforeStart: vi.fn(),
  };
}

describe("useTourOrchestration", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    capturedOnComplete = undefined;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns showWelcome and three handlers", () => {
    const opts = createOptions();
    const { result } = renderHook(() => useTourOrchestration(opts));

    expect(typeof result.current.showWelcome).toBe("boolean");
    expect(typeof result.current.handleTakeTour).toBe("function");
    expect(typeof result.current.handleSkipTour).toBe("function");
    expect(typeof result.current.handleReplayTour).toBe("function");
  });

  it("sets showWelcome to true when tourCompleted is false", () => {
    const opts = createOptions({ tourCompleted: false });
    const { result } = renderHook(() => useTourOrchestration(opts));

    expect(result.current.showWelcome).toBe(true);
  });

  it("keeps showWelcome false when tourCompleted is true", () => {
    const opts = createOptions({ tourCompleted: true });
    const { result } = renderHook(() => useTourOrchestration(opts));

    expect(result.current.showWelcome).toBe(false);
  });

  it("keeps showWelcome false when tourCompleted is undefined", () => {
    const opts = createOptions({ tourCompleted: undefined });
    const { result } = renderHook(() => useTourOrchestration(opts));

    expect(result.current.showWelcome).toBe(false);
  });

  it("handleTakeTour dismisses welcome, calls beforeStart, and schedules startTour", () => {
    const opts = createOptions({ tourCompleted: false });
    const { result } = renderHook(() => useTourOrchestration(opts));

    act(() => result.current.handleTakeTour());

    expect(result.current.showWelcome).toBe(false);
    expect(opts.beforeStart).toHaveBeenCalledOnce();
    expect(mockStartTour).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(300));

    expect(mockStartTour).toHaveBeenCalledOnce();
  });

  it("handleSkipTour dismisses welcome and persists tourCompleted", async () => {
    const opts = createOptions({ tourCompleted: false });
    const { result } = renderHook(() => useTourOrchestration(opts));

    await act(() => result.current.handleSkipTour());

    expect(result.current.showWelcome).toBe(false);
    expect(opts.updatePreferences).toHaveBeenCalledWith({ tourCompleted: true });
  });

  it("handleReplayTour does not change showWelcome", () => {
    const opts = createOptions({ tourCompleted: true });
    const { result } = renderHook(() => useTourOrchestration(opts));

    expect(result.current.showWelcome).toBe(false);

    act(() => result.current.handleReplayTour());

    expect(result.current.showWelcome).toBe(false);
    expect(opts.beforeStart).toHaveBeenCalledOnce();

    act(() => vi.advanceTimersByTime(300));

    expect(mockStartTour).toHaveBeenCalledOnce();
  });

  it("tour completion persists preference via onComplete callback", () => {
    const opts = createOptions({ tourCompleted: false });
    renderHook(() => useTourOrchestration(opts));

    expect(capturedOnComplete).toBeDefined();
    capturedOnComplete!();

    expect(opts.updatePreferences).toHaveBeenCalledWith({ tourCompleted: true });
  });

  it("does not call startTour before delay elapses", () => {
    const opts = createOptions({ tourCompleted: false });
    const { result } = renderHook(() => useTourOrchestration(opts));

    act(() => result.current.handleTakeTour());
    act(() => vi.advanceTimersByTime(200));

    expect(mockStartTour).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(100));

    expect(mockStartTour).toHaveBeenCalledOnce();
  });

  it("calls beforeStart synchronously before the delayed startTour", () => {
    const opts = createOptions({ tourCompleted: false });
    const { result } = renderHook(() => useTourOrchestration(opts));

    act(() => result.current.handleTakeTour());

    expect(opts.beforeStart).toHaveBeenCalledOnce();
    expect(mockStartTour).not.toHaveBeenCalled();
  });
});
