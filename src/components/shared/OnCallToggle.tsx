"use client";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface OnCallToggleProps {
  isOnCall: boolean;
  onToggle: () => void;
}

export function OnCallToggle({ isOnCall, onToggle }: OnCallToggleProps) {
  return (
    <div id="on-call-toggle" className="flex items-center gap-3">
      <Switch
        checked={isOnCall}
        onCheckedChange={onToggle}
        className={cn(
          isOnCall && "data-[state=checked]:bg-yellow-activity"
        )}
      />
      <Label className={cn("text-sm font-medium", isOnCall && "text-yellow-activity")}>
        {isOnCall ? "On-Call" : "Off-Call"}
      </Label>
    </div>
  );
}
