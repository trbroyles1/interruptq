"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { useBoards } from "@/hooks/useBoards";

const MAX_BOARDS_PER_USER = 5;
const BOARD_NAME_PATTERN = /^[a-zA-Z0-9_-]+$/;
const BOARD_AUTOCOMPLETE_LIMIT = 10;
const DEBOUNCE_MS = 300;

interface BoardsPanelProps {
  handle: string | null;
  wrap: (fn: () => Promise<void>) => Promise<void>;
}

interface AutocompleteResult {
  nameCanonical: string;
  nameDisplay: string;
  participantCount: number;
}

export function BoardsPanel({ handle, wrap }: BoardsPanelProps) {
  const { boards, joinBoard, leaveBoard } = useBoards();
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<AutocompleteResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const atLimit = boards.length >= MAX_BOARDS_PER_USER;
  const inputDisabled = !handle || atLimit;

  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    try {
      const res = await fetch(
        `/api/boards?q=${encodeURIComponent(query)}`
      );
      if (res.ok) {
        const data: AutocompleteResult[] = await res.json();
        setSuggestions(data.slice(0, BOARD_AUTOCOMPLETE_LIMIT));
        setShowDropdown(data.length > 0);
      }
    } catch {
      setSuggestions([]);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleInputChange = (value: string) => {
    const filtered = value.replace(/[^a-zA-Z0-9_-]/g, "");
    setInputValue(filtered);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(filtered);
    }, DEBOUNCE_MS);
  };

  const handleJoin = async (name: string) => {
    if (!name || !BOARD_NAME_PATTERN.test(name)) return;
    setInputValue("");
    setSuggestions([]);
    setShowDropdown(false);
    await wrap(async () => {
      await joinBoard(name);
    });
  };

  const handleLeave = async (canonicalName: string) => {
    await wrap(async () => {
      await leaveBoard(canonicalName);
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue) {
      e.preventDefault();
      handleJoin(inputValue);
    }
  };

  const handleBlur = (e: React.FocusEvent) => {
    if (
      dropdownRef.current &&
      e.relatedTarget instanceof Node &&
      dropdownRef.current.contains(e.relatedTarget)
    ) {
      return;
    }
    setTimeout(() => setShowDropdown(false), 150);
  };

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase text-muted-foreground">
        Boards
      </h3>

      {boards.length === 0 ? (
        <p className="text-xs text-muted-foreground">No boards joined</p>
      ) : (
        <div className="flex flex-wrap gap-1">
          {boards.map((board) => (
            <div
              key={board.id}
              className="flex items-center gap-1 text-sm px-2 py-1 rounded bg-accent/50"
            >
              <a
                href={`/boards/${board.boardNameCanonical}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                {board.boardNameDisplay}
              </a>
              <button
                onClick={() => handleLeave(board.boardNameCanonical)}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {!handle && (
        <p className="text-xs text-muted-foreground">
          Set a handle in Preferences to join boards
        </p>
      )}

      {handle && atLimit && (
        <p className="text-xs text-muted-foreground">
          Leave a board to join a new one
        </p>
      )}

      <div className="relative">
        <Input
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          disabled={inputDisabled}
          className="h-7 text-xs"
          placeholder="Join or create a board..."
        />
        {showDropdown && suggestions.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute left-0 right-0 top-full mt-1 bg-popover border rounded-md shadow-md z-50 max-h-48 overflow-y-auto"
          >
            {suggestions.map((s) => (
              <button
                key={s.nameCanonical}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleJoin(s.nameCanonical)}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors flex items-center justify-between"
              >
                <span>{s.nameDisplay}</span>
                <span className="text-xs text-muted-foreground">
                  {s.participantCount} member{s.participantCount !== 1 ? "s" : ""}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
