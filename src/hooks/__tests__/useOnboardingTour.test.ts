// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useOnboardingTour } from "../useOnboardingTour";

const mockDrive = vi.fn();
const mockDestroy = vi.fn();
let capturedOnDestroyStarted: (() => void) | undefined;

vi.mock("driver.js", () => ({
  driver: vi.fn((config?: { onDestroyStarted?: () => void }) => {
    capturedOnDestroyStarted = config?.onDestroyStarted;
    return { drive: mockDrive, destroy: mockDestroy };
  }),
}));

vi.mock("driver.js/dist/driver.css", () => ({}));
vi.mock("@/components/onboarding/tour-theme.css", () => ({}));

describe("useOnboardingTour", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedOnDestroyStarted = undefined;
  });

  it("returns a startTour function", () => {
    const { result } = renderHook(() =>
      useOnboardingTour({ onComplete: vi.fn() }),
    );

    expect(typeof result.current.startTour).toBe("function");
  });

  it("starts driver.js when startTour is called", async () => {
    const { driver } = await import("driver.js");
    const { result } = renderHook(() =>
      useOnboardingTour({ onComplete: vi.fn() }),
    );

    act(() => result.current.startTour());

    expect(driver).toHaveBeenCalledOnce();
    expect(mockDrive).toHaveBeenCalledOnce();
  });

  it("passes TOUR_STEPS to driver configuration", async () => {
    const { driver } = await import("driver.js");
    const { TOUR_STEPS } = await import(
      "@/components/onboarding/tour-steps"
    );
    const { result } = renderHook(() =>
      useOnboardingTour({ onComplete: vi.fn() }),
    );

    act(() => result.current.startTour());

    const config = vi.mocked(driver).mock.calls[0][0];
    expect(config.steps).toBe(TOUR_STEPS);
  });

  it("calls onComplete when the tour is destroyed", () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      useOnboardingTour({ onComplete }),
    );

    act(() => result.current.startTour());
    expect(onComplete).not.toHaveBeenCalled();

    act(() => capturedOnDestroyStarted!());
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it("calls destroy on the driver when the tour is destroyed", () => {
    const { result } = renderHook(() =>
      useOnboardingTour({ onComplete: vi.fn() }),
    );

    act(() => result.current.startTour());
    act(() => capturedOnDestroyStarted!());

    expect(mockDestroy).toHaveBeenCalledOnce();
  });

  it("destroys a previous driver instance before creating a new one", () => {
    const { result } = renderHook(() =>
      useOnboardingTour({ onComplete: vi.fn() }),
    );

    act(() => result.current.startTour());
    mockDestroy.mockClear();

    act(() => result.current.startTour());

    // First call: destroy previous instance; second would be from onDestroyStarted
    expect(mockDestroy).toHaveBeenCalledOnce();
  });
});
