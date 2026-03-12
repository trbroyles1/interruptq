"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { useTags } from "@/hooks/useTags";

interface ActivityInputProps {
  onSubmit: (text: string) => void;
}

export function ActivityInput({ onSubmit }: ActivityInputProps) {
  const [value, setValue] = useState("");
  const [tagQuery, setTagQuery] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { tags } = useTags(tagQuery ?? undefined);

  // Detect @-mention being typed
  const updateTagQuery = useCallback((text: string, cursorPos: number) => {
    const beforeCursor = text.slice(0, cursorPos);
    const atMatch = beforeCursor.match(/@([A-Za-z0-9_-]*)$/);
    if (atMatch) {
      setTagQuery(atMatch[1]);
      setShowSuggestions(true);
      setSelectedIndex(0);
    } else {
      setTagQuery(null);
      setShowSuggestions(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    updateTagQuery(newValue, e.target.selectionStart ?? newValue.length);
  };

  const insertTag = useCallback(
    (tagName: string) => {
      const cursorPos = inputRef.current?.selectionStart ?? value.length;
      const beforeCursor = value.slice(0, cursorPos);
      const afterCursor = value.slice(cursorPos);
      const atIndex = beforeCursor.lastIndexOf("@");
      const newValue = beforeCursor.slice(0, atIndex) + `@${tagName} ` + afterCursor;
      setValue(newValue);
      setShowSuggestions(false);
      setTagQuery(null);

      // Re-focus input
      setTimeout(() => {
        inputRef.current?.focus();
        const newCursorPos = atIndex + tagName.length + 2;
        inputRef.current?.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    },
    [value],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showSuggestions && tags.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, tags.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Tab" || e.key === "Enter") {
        if (showSuggestions && tags.length > 0) {
          e.preventDefault();
          insertTag(tags[selectedIndex]);
          return;
        }
      }
      if (e.key === "Escape") {
        setShowSuggestions(false);
        return;
      }
    }

    if (e.key === "Enter" && !showSuggestions) {
      e.preventDefault();
      const trimmed = value.trim();
      if (trimmed) {
        onSubmit(trimmed);
        setValue("");
      }
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handler = () => setShowSuggestions(false);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="What are you working on? (e.g., TIK-789 @Mark bugfix)"
        className="h-12 text-lg bg-card border-border"
        autoFocus
      />
      {showSuggestions && tags.length > 0 && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-popover border border-border rounded-md shadow-lg z-50 overflow-hidden">
          {tags.map((tag, i) => (
            <button
              key={tag}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-accent ${i === selectedIndex ? "bg-accent" : ""}`}
              onMouseDown={(e) => {
                e.preventDefault();
                insertTag(tag);
              }}
            >
              @{tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
