"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { Copy, Check, KeyRound, Plus } from "lucide-react";

export function WelcomeScreen() {
  const { connect, generate, confirmGenerated } = useAuth();

  const [token, setToken] = useState("");
  const [connectError, setConnectError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleConnect = async () => {
    if (!token.trim()) return;
    setConnecting(true);
    setConnectError(null);
    const result = await connect(token.trim());
    if (!result.ok) {
      setConnectError(result.error || "Token not recognized");
    }
    setConnecting(false);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    const result = await generate();
    setGeneratedToken(result.token);
    setGenerating(false);
  };

  const handleCopy = async () => {
    if (!generatedToken) return;
    await navigator.clipboard.writeText(generatedToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirmSaved = async () => {
    // Token is already set in cookie by generate().
    // Now flush SWR caches and revalidate auth to transition into the app.
    await confirmGenerated();
  };

  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <div className="w-full max-w-md space-y-8 p-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">InterruptQ</h1>
          <p className="text-muted-foreground text-sm">
            Time tracking for developers who get interrupted
          </p>
        </div>

        {!generatedToken ? (
          <>
            {/* Connect with existing token */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <KeyRound className="h-4 w-4" />
                Connect with existing token
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="iqt-..."
                  value={token}
                  onChange={(e) => {
                    setToken(e.target.value);
                    setConnectError(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleConnect()}
                  className="font-mono text-sm"
                />
                <Button
                  onClick={handleConnect}
                  disabled={connecting || !token.trim()}
                >
                  {connecting ? "..." : "Connect"}
                </Button>
              </div>
              {connectError && (
                <p className="text-sm text-destructive">{connectError}</p>
              )}
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">or</span>
              </div>
            </div>

            {/* Generate new token */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Plus className="h-4 w-4" />
                Start fresh
              </div>
              <Button
                onClick={handleGenerate}
                disabled={generating}
                variant="outline"
                className="w-full"
              >
                {generating ? "Generating..." : "Generate new token"}
              </Button>
            </div>
          </>
        ) : (
          /* Token generated — show it once */
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-lg p-4 space-y-3">
              <p className="text-sm font-semibold text-yellow-500">
                Save this token now — it will not be shown again
              </p>
              <div className="flex gap-2">
                <code className="flex-1 bg-muted rounded px-3 py-2 text-xs font-mono break-all select-all">
                  {generatedToken}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <p>
                  <strong>Do not share this token.</strong> Anyone with it can
                  access and modify your data.
                </p>
                <p>
                  <strong>Save it securely</strong> (e.g., a password manager).
                  If lost, there is no way to recover it or your data.
                </p>
              </div>
            </div>

            <Button onClick={handleConfirmSaved} className="w-full">
              I've saved my token — continue
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
