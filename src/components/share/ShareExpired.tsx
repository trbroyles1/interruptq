"use client";

import { LinkIcon } from "lucide-react";

export function ShareExpired() {
  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <div className="text-center space-y-4 max-w-sm">
        <LinkIcon className="h-12 w-12 mx-auto text-muted-foreground" />
        <h1 className="text-xl font-bold">Link no longer valid</h1>
        <p className="text-sm text-muted-foreground">
          This share link has expired or been revoked. Ask the owner to generate
          a new link if you still need access.
        </p>
      </div>
    </div>
  );
}
