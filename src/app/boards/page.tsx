"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Input } from "@/components/ui/input";
import { AppBreadcrumb } from "@/components/shared/AppBreadcrumb";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("Failed to load boards");
    return r.json();
  });

const DEBOUNCE_MS = 300;

interface BoardListItem {
  nameCanonical: string;
  nameDisplay: string;
  participantCount: number;
}

export default function BoardsIndexPage() {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchInput.trim());
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const apiUrl = debouncedQuery
    ? `/api/boards?q=${encodeURIComponent(debouncedQuery)}`
    : "/api/boards";

  const { data, isLoading } = useSWR<BoardListItem[]>(apiUrl, fetcher);
  const boards = data ?? [];

  return (
    <div className="bg-background min-h-screen">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div className="space-y-2">
          <AppBreadcrumb crumbs={[{ label: "Boards" }]} />
          <h1 className="text-2xl font-bold text-foreground">Boards</h1>
        </div>

        <Input
          type="text"
          placeholder="Search boards..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="max-w-md"
        />

        {isLoading && (
          <p className="text-sm text-muted-foreground py-4">
            Loading boards...
          </p>
        )}

        {!isLoading && boards.length === 0 && (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No boards yet.
          </p>
        )}

        {!isLoading && boards.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {boards.map((board) => (
              <Link
                key={board.nameCanonical}
                href={`/boards/${board.nameCanonical}`}
                className="bg-card border border-border rounded-lg p-4 hover:border-foreground/20 transition-colors cursor-pointer"
              >
                <p className="font-medium text-foreground">
                  {board.nameDisplay}
                </p>
                <p className="text-sm text-muted-foreground">
                  {board.participantCount}{" "}
                  {board.participantCount === 1
                    ? "participant"
                    : "participants"}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
