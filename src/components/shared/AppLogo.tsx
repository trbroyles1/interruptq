"use client";

import Link from "next/link";

const ICON_PATH = "/icons/icon.svg";
const APP_NAME = "InterruptQ";
const HOME_HREF = "/";

interface AppLogoProps {
  size?: number;
  showName?: boolean;
}

export function AppLogo({ size = 24, showName = true }: AppLogoProps) {
  return (
    <Link
      href={HOME_HREF}
      className="flex items-center gap-2 hover:opacity-80 transition-opacity"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={ICON_PATH} alt={APP_NAME} width={size} height={size} className="rounded" />
      {showName && (
        <span className="text-lg font-bold text-foreground">{APP_NAME}</span>
      )}
    </Link>
  );
}
