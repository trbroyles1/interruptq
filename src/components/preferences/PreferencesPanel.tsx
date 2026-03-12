"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Settings } from "lucide-react";
import type { Preferences, DayOfWeek, WorkingHours } from "@/types";

interface PreferencesPanelProps {
  preferences: Preferences | null;
  onSave: (updates: Partial<Preferences>) => Promise<void>;
}

const DAY_LABELS: Record<DayOfWeek, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

const DAY_ORDER: DayOfWeek[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export function PreferencesPanel({ preferences, onSave }: PreferencesPanelProps) {
  const [open, setOpen] = useState(false);

  if (!preferences) return null;

  const handleWorkingHoursChange = async (
    day: DayOfWeek,
    field: "enabled" | "start" | "end",
    value: boolean | string
  ) => {
    const wh: WorkingHours = { ...preferences.workingHours };
    wh[day] = { ...wh[day], [field]: value };
    await onSave({ workingHours: wh });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={<Button variant="ghost" size="sm" className="h-8 w-8 p-0" />}
      >
        <Settings className="h-4 w-4" />
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Preferences</SheetTitle>
        </SheetHeader>
        <div className="space-y-6 mt-4">
          {/* Working Hours */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Working Hours</Label>
            {DAY_ORDER.map((day) => {
              const schedule = preferences.workingHours[day];
              return (
                <div key={day} className="flex items-center gap-2">
                  <Switch
                    checked={schedule.enabled}
                    onCheckedChange={(v) =>
                      handleWorkingHoursChange(day, "enabled", v)
                    }
                  />
                  <span className="text-sm w-20">{DAY_LABELS[day]}</span>
                  {schedule.enabled && (
                    <>
                      <Input
                        type="time"
                        value={schedule.start}
                        onChange={(e) =>
                          handleWorkingHoursChange(day, "start", e.target.value)
                        }
                        className="h-7 w-24 text-xs"
                      />
                      <span className="text-xs text-muted-foreground">to</span>
                      <Input
                        type="time"
                        value={schedule.end}
                        onChange={(e) =>
                          handleWorkingHoursChange(day, "end", e.target.value)
                        }
                        className="h-7 w-24 text-xs"
                      />
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* On-Call Prefix */}
          <div className="space-y-2">
            <Label htmlFor="oncall-prefix" className="text-sm font-semibold">
              On-Call Ticket Prefix
            </Label>
            <Input
              id="oncall-prefix"
              value={preferences.onCallPrefix}
              onChange={(e) => onSave({ onCallPrefix: e.target.value })}
              className="h-8 text-sm"
            />
          </div>

          {/* Quick Pick Counts */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Quick-Pick Counts</Label>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Recent (normal)</span>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={preferences.quickPickRecentCount}
                  onChange={(e) =>
                    onSave({ quickPickRecentCount: parseInt(e.target.value) || 10 })
                  }
                  className="h-7 w-16 text-sm text-center"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">On-call tickets</span>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={preferences.quickPickOncallTicketCount}
                  onChange={(e) =>
                    onSave({
                      quickPickOncallTicketCount: parseInt(e.target.value) || 5,
                    })
                  }
                  className="h-7 w-16 text-sm text-center"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Recent other (on-call)</span>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={preferences.quickPickOncallOtherCount}
                  onChange={(e) =>
                    onSave({
                      quickPickOncallOtherCount: parseInt(e.target.value) || 5,
                    })
                  }
                  className="h-7 w-16 text-sm text-center"
                />
              </div>
            </div>
          </div>

          {/* Week Start Day */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Week Start Day</Label>
            <select
              value={preferences.weekStartDay}
              onChange={(e) =>
                onSave({ weekStartDay: parseInt(e.target.value) })
              }
              className="h-8 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value={0}>Sunday</option>
              <option value={1}>Monday</option>
              <option value={6}>Saturday</option>
            </select>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
