"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus, GripVertical } from "lucide-react";
import type { PriorityItem } from "@/types";

interface PrioritiesListProps {
  priorities: PriorityItem[];
  snapshotCount: number;
  sprintGoals: string[];
  onSave: (priorities: PriorityItem[]) => Promise<void>;
}

export function PrioritiesList({
  priorities,
  snapshotCount,
  sprintGoals,
  onSave,
}: PrioritiesListProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<PriorityItem[]>(priorities);
  const [newItem, setNewItem] = useState("");

  // Check if priorities diverge from sprint goals
  const hasDiverged =
    priorities.length !== sprintGoals.length ||
    priorities.some(
      (p, i) =>
        p.type !== "ticket" ||
        p.value.toUpperCase() !== sprintGoals[i]?.toUpperCase()
    );

  const startEdit = () => {
    setDraft([...priorities]);
    setEditing(true);
  };

  const addItem = () => {
    const trimmed = newItem.trim();
    if (!trimmed) return;

    // If it looks like a ticket (e.g., TIK-123), mark as ticket
    const isTicket = /^[A-Z][A-Z0-9]+-\d+$/i.test(trimmed);
    const item: PriorityItem = {
      type: isTicket ? "ticket" : "text",
      value: isTicket ? trimmed.toUpperCase() : trimmed,
    };

    setDraft([...draft, item]);
    setNewItem("");
  };

  const removeItem = (index: number) => {
    setDraft(draft.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    await onSave(draft);
    setEditing(false);
  };

  if (!editing) {
    return (
      <div id="priorities-panel" className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase text-muted-foreground">
            Priorities
          </h3>
          <Button variant="ghost" size="sm" onClick={startEdit} className="h-6 text-xs">
            Edit
          </Button>
        </div>
        {hasDiverged && (
          <p className="text-xs text-yellow-activity">
            Priorities have diverged from sprint goals
          </p>
        )}
        {priorities.length === 0 ? (
          <p className="text-xs text-muted-foreground">No priorities set</p>
        ) : (
          <ul className="space-y-1">
            {priorities.map((p, i) => (
              <li
                key={`${p.value}-${i}`}
                className="text-sm px-2 py-1 rounded bg-yellow-activity/10 text-yellow-activity"
              >
                {p.value}
                {p.type === "text" && (
                  <span className="text-xs text-muted-foreground ml-1">(text)</span>
                )}
              </li>
            ))}
          </ul>
        )}
        {snapshotCount > 1 && (
          <p className="text-xs text-muted-foreground">
            Changed {snapshotCount - 1} time{snapshotCount - 1 > 1 ? "s" : ""} this sprint
          </p>
        )}
      </div>
    );
  }

  return (
    <div id="priorities-panel" className="space-y-2">
      <h3 className="text-xs font-semibold uppercase text-muted-foreground">
        Edit Priorities
      </h3>
      <div className="space-y-1">
        {draft.map((item, i) => (
          <div key={`${item.value}-${i}`} className="flex items-center gap-1">
            <GripVertical className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="text-sm flex-1">
              {item.value}
              {item.type === "text" && (
                <span className="text-xs text-muted-foreground ml-1">(text)</span>
              )}
            </span>
            <button
              onClick={() => removeItem(i)}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-1">
        <Input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addItem()}
          placeholder="TIK-123 or free text"
          className="h-7 text-xs"
        />
        <Button variant="ghost" size="sm" onClick={addItem} className="h-7 px-2">
          <Plus className="h-3 w-3" />
        </Button>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} className="h-7 text-xs">
          Save
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setEditing(false)}
          className="h-7 text-xs"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
