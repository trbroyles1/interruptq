"use client";

import { useRef, useCallback } from "react";
import { driver, type Driver } from "driver.js";
import "driver.js/dist/driver.css";
import "@/components/onboarding/tour-theme.css";
import { TOUR_STEPS } from "@/components/onboarding/tour-steps";

interface UseOnboardingTourOptions {
  onComplete: () => void;
}

export function useOnboardingTour({ onComplete }: UseOnboardingTourOptions) {
  const driverRef = useRef<Driver | null>(null);

  const startTour = useCallback(() => {
    if (driverRef.current) {
      driverRef.current.destroy();
    }

    const driverObj = driver({
      showProgress: true,
      showButtons: ["next", "previous", "close"],
      overlayColor: "black",
      overlayOpacity: 0.5,
      stagePadding: 8,
      stageRadius: 8,
      steps: TOUR_STEPS,
      onDestroyStarted: () => {
        onComplete();
        driverObj.destroy();
      },
    });

    driverRef.current = driverObj;
    driverObj.drive();
  }, [onComplete]);

  return { startTour };
}
