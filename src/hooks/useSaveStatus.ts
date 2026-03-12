"use client";

import { useState, useCallback, useRef } from "react";

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function useSaveStatus() {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const startSave = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setStatus("saving");
  }, []);

  const onSuccess = useCallback(() => {
    setStatus("saved");
    timeoutRef.current = setTimeout(() => setStatus("idle"), 2000);
  }, []);

  const onError = useCallback(() => {
    setStatus("error");
    timeoutRef.current = setTimeout(() => setStatus("idle"), 4000);
  }, []);

  const wrap = useCallback(
    async <T>(fn: () => Promise<T>): Promise<T | undefined> => {
      startSave();
      try {
        const result = await fn();
        onSuccess();
        return result;
      } catch {
        onError();
        return undefined;
      }
    },
    [startSave, onSuccess, onError]
  );

  return { status, wrap };
}
