"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Share2, Copy, Check, Trash2 } from "lucide-react";
import { useShareLinks } from "@/hooks/useShareLinks";

export function ShareLinkManager() {
  const { links, createLink, revokeLink } = useShareLinks();
  const [newUrl, setNewUrl] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    setCreating(true);
    setCreateError(null);
    setNewUrl(null);
    const result = await createLink();
    if ("error" in result) {
      setCreateError(result.error);
    } else {
      setNewUrl(result.url);
    }
    setCreating(false);
  };

  const handleCopy = async (url: string) => {
    await navigator.clipboard.writeText(url);
    setCopied(url);
    setTimeout(() => setCopied(null), 2000);
  };

  const truncateUrl = (url: string) => {
    if (url.length <= 50) return url;
    return url.slice(0, 30) + "..." + url.slice(-15);
  };

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
            <Share2 className="h-3 w-3" />
            Share
          </Button>
        }
      />
      <DialogContent className="max-w-md overflow-hidden">
        <DialogHeader>
          <DialogTitle>Share Reports</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2 overflow-hidden">
          {/* Generate new link */}
          <div className="space-y-2">
            <Button
              onClick={handleCreate}
              disabled={creating || links.length >= 5}
              size="sm"
              className="w-full"
            >
              {creating ? "Generating..." : "Generate new link"}
            </Button>
            {links.length >= 5 && (
              <p className="text-xs text-muted-foreground">
                Maximum 5 active links. Revoke an existing link to create a new
                one.
              </p>
            )}
            {createError && (
              <p className="text-xs text-destructive">{createError}</p>
            )}
          </div>

          {/* Newly generated link */}
          {newUrl && (
            <div className="bg-muted rounded-md p-3 space-y-2">
              <p className="text-xs font-medium text-green-500">
                Link created!
              </p>
              <div className="flex gap-2 items-center">
                <code className="flex-1 text-xs font-mono break-all select-all">
                  {newUrl}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(newUrl)}
                  className="shrink-0 h-7 w-7 p-0"
                >
                  {copied === newUrl ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Active links */}
          {links.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Active links ({links.length}/5)
              </p>
              {links.map((link: { shareId: string; createdAt: string; expiresAt: string }) => {
                const url = `${window.location.origin}/share/${link.shareId}`;
                return (
                  <div
                    key={link.shareId}
                    className="flex items-center gap-2 bg-card border border-border rounded-md px-3 py-2"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono truncate">
                        {truncateUrl(url)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Expires{" "}
                        {new Date(link.expiresAt).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(url)}
                      className="h-7 w-7 p-0 shrink-0"
                    >
                      {copied === url ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => revokeLink(link.shareId)}
                      className="h-7 w-7 p-0 shrink-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {links.length === 0 && !newUrl && (
            <p className="text-xs text-muted-foreground text-center py-2">
              No active share links. Generate one to share your reports.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
