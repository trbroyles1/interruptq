"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import type { Sprint } from "@/types";

interface SprintPanelProps {
  sprint: Sprint | null;
  onCutover: (date?: string) => Promise<void>;
}

export function SprintPanel({ sprint, onCutover }: SprintPanelProps) {
  const [cutoverDate, setCutoverDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [loading, setLoading] = useState(false);

  const handleCutover = async () => {
    setLoading(true);
    try {
      await onCutover(cutoverDate);
    } finally {
      setLoading(false);
    }
  };

  if (!sprint) {
    return <div className="text-sm text-muted-foreground">No active sprint</div>;
  }

  const elapsedDays = Math.floor(
    (Date.now() - new Date(sprint.startDate).getTime()) / 86400000
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Sprint {sprint.ordinal}</h3>
          <p className="text-xs text-muted-foreground">
            Started {sprint.startDate} · Day {elapsedDays + 1}
          </p>
        </div>
        <Dialog>
          <DialogTrigger render={<Button variant="outline" size="sm" />}>
            Cutover
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Sprint Cutover</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                End Sprint {sprint.ordinal} and start Sprint{" "}
                {sprint.ordinal + 1}.
              </p>
              <div className="space-y-2">
                <Label htmlFor="cutover-date">Cutover date</Label>
                <Input
                  id="cutover-date"
                  type="date"
                  value={cutoverDate}
                  onChange={(e) => setCutoverDate(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <DialogClose render={<Button variant="outline" />}>
                  Cancel
                </DialogClose>
                <DialogClose
                  render={<Button onClick={handleCutover} disabled={loading} />}
                >
                  {loading ? "Cutting over..." : "Cutover"}
                </DialogClose>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
