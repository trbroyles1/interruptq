"use client";

import { useState, useEffect, useCallback } from "react";
import { useOnboardingTour } from "@/hooks/useOnboardingTour";
import type { Preferences } from "@/types";

const TOUR_START_DELAY_MS = 300;

interface UseTourOrchestrationOptions {
  tourCompleted: boolean | undefined;
  updatePreferences: (updates: Partial<Preferences>) => Promise<unknown>;
  beforeStart: () => void;
}

export function useTourOrchestration({
  tourCompleted,
  updatePreferences,
  beforeStart,
}: UseTourOrchestrationOptions) {
  const [showWelcome, setShowWelcome] = useState(false);

  const { startTour } = useOnboardingTour({
    onComplete: () => {
      void updatePreferences({ tourCompleted: true });
    },
  });

  useEffect(() => {
    if (tourCompleted === false) {
      setShowWelcome(true);
    }
  }, [tourCompleted]);

  const handleTakeTour = useCallback(() => {
    setShowWelcome(false);
    beforeStart();
    setTimeout(() => startTour(), TOUR_START_DELAY_MS);
  }, [beforeStart, startTour]);

  const handleSkipTour = useCallback(async () => {
    setShowWelcome(false);
    await updatePreferences({ tourCompleted: true });
  }, [updatePreferences]);

  const handleReplayTour = useCallback(() => {
    beforeStart();
    setTimeout(() => startTour(), TOUR_START_DELAY_MS);
  }, [beforeStart, startTour]);

  return { showWelcome, handleTakeTour, handleSkipTour, handleReplayTour };
}
