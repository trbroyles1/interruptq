"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface WelcomeDialogProps {
  readonly open: boolean;
  readonly onTakeTour: () => void;
  readonly onSkip: () => void;
}

const CLASSIFICATIONS = [
  {
    label: "On-Target",
    description: "Work matching your sprint goals",
    colorClass: "bg-green-activity/15 text-green-activity",
    dotClass: "bg-green-activity",
  },
  {
    label: "Re-Prioritized",
    description: "Matches current priorities, not sprint goals",
    colorClass: "bg-yellow-activity/15 text-yellow-activity",
    dotClass: "bg-yellow-activity",
  },
  {
    label: "Interrupted",
    description: "Unplanned work outside goals and priorities",
    colorClass: "bg-red-activity/15 text-red-activity",
    dotClass: "bg-red-activity",
  },
] as const;

export function WelcomeDialog({
  open,
  onTakeTour,
  onSkip,
}: WelcomeDialogProps) {
  return (
    <Dialog open={open}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Welcome to InterruptQ</DialogTitle>
          <DialogDescription>
            InterruptQ tracks where your time goes and automatically classifies
            it based on your sprint goals and priorities.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          {CLASSIFICATIONS.map(
            ({ label, description, colorClass, dotClass }) => (
              <div
                key={label}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 ${colorClass}`}
              >
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotClass}`}
                />
                <div className="min-w-0">
                  <span className="text-sm font-medium">{label}</span>
                  <span className="text-sm opacity-75">
                    {" "}
                    — {description}
                  </span>
                </div>
              </div>
            ),
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onSkip}>
            Skip for now
          </Button>
          <Button
            onClick={onTakeTour}
            className="bg-green-activity text-white hover:bg-green-activity/90"
          >
            Take the tour
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
