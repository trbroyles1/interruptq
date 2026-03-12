"use client";

import { useEffect, useRef } from "react";
import { getEndOfWorkDay } from "@/lib/time";
import type { Activity, Preferences } from "@/types";

export function useAutoBreak(
  latestActivity: Activity | null,
  preferences: Preferences | null,
  startBreak: () => Promise<unknown>
) {
  const creatingRef = useRef(false);

  useEffect(() => {
    if (!preferences || !latestActivity) return;

    const check = () => {
      if (creatingRef.current) return;

      // Already on break — nothing to do
      if (latestActivity.classification === "break") return;

      const now = new Date();
      const endOfDay = getEndOfWorkDay(now, preferences.workingHours);

      // Non-working day or still within working hours
      if (!endOfDay || now <= endOfDay) return;

      // Past end of workday and not on break — auto-break
      creatingRef.current = true;
      startBreak().finally(() => {
        creatingRef.current = false;
      });
    };

    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [latestActivity, preferences, startBreak]);
}
