"use client";

import { Eye } from "lucide-react";

interface ShareBannerProps {
  expiresAt: string | null;
}

export function ShareBanner({ expiresAt }: ShareBannerProps) {
  const expiresLabel = expiresAt
    ? new Date(expiresAt).toLocaleString()
    : "unknown";

  return (
    <div className="bg-muted/50 border-b border-border px-4 py-2 flex items-center gap-2 text-sm text-muted-foreground">
      <Eye className="h-4 w-4" />
      <span>Shared view</span>
      <span className="text-xs">— expires {expiresLabel}</span>
    </div>
  );
}
