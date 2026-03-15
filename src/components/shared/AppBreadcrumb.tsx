"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { AppLogo } from "./AppLogo";

const SEPARATOR_CLASS = "text-muted-foreground/50";

interface Crumb {
  label: string;
  href?: string;
}

interface AppBreadcrumbProps {
  crumbs: Crumb[];
}

export function AppBreadcrumb({ crumbs }: AppBreadcrumbProps) {
  return (
    <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <AppLogo size={28} showName={false} />
      {crumbs.map((crumb) => (
        <span key={crumb.label} className="flex items-center gap-1.5">
          <ChevronRight className={`h-3.5 w-3.5 ${SEPARATOR_CLASS}`} />
          {crumb.href ? (
            <Link
              href={crumb.href}
              className="hover:text-foreground transition-colors"
            >
              {crumb.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
