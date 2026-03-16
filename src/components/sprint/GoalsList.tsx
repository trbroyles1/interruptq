"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus, GripVertical } from "lucide-react";

interface GoalsListProps {
  goals: string[];
  snapshotCount: number;
  onSave: (goals: string[]) => Promise<void>;
}

export function GoalsList({ goals, snapshotCount, onSave }: GoalsListProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string[]>(goals);
  const [newGoal, setNewGoal] = useState("");

  const startEdit = () => {
    setDraft([...goals]);
    setEditing(true);
  };

  const addGoal = () => {
    const trimmed = newGoal.trim().toUpperCase();
    if (trimmed && !draft.includes(trimmed)) {
      setDraft([...draft, trimmed]);
      setNewGoal("");
    }
  };

  const removeGoal = (index: number) => {
    setDraft(draft.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    await onSave(draft);
    setEditing(false);
  };

  if (!editing) {
    return (
      <div id="sprint-goals" className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase text-muted-foreground">
            Sprint Goals
          </h3>
          <Button variant="ghost" size="sm" onClick={startEdit} className="h-6 text-xs">
            Edit
          </Button>
        </div>
        {goals.length === 0 ? (
          <p className="text-xs text-muted-foreground">No goals set</p>
        ) : (
          <ul className="space-y-1">
            {goals.map((goal) => (
              <li
                key={goal}
                className="text-sm px-2 py-1 rounded bg-green-activity/10 text-green-activity"
              >
                {goal}
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
    <div id="sprint-goals" className="space-y-2">
      <h3 className="text-xs font-semibold uppercase text-muted-foreground">
        Edit Sprint Goals
      </h3>
      <div className="space-y-1">
        {draft.map((goal, i) => (
          <div key={`${goal}-${i}`} className="flex items-center gap-1">
            <GripVertical className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="text-sm flex-1">{goal}</span>
            <button
              onClick={() => removeGoal(i)}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-1">
        <Input
          value={newGoal}
          onChange={(e) => setNewGoal(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addGoal()}
          placeholder="TIK-123"
          className="h-7 text-xs"
        />
        <Button variant="ghost" size="sm" onClick={addGoal} className="h-7 px-2">
          <Plus className="h-3 w-3" />
        </Button>
      </div>
      <p className="text-xs text-yellow-activity">
        Saving will overwrite the priority list.
      </p>
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
