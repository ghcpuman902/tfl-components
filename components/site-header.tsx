"use client";

import Link from "next/link";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { TfLRoundel } from "@/components/tfl/brand/tfl-roundel";

export const SiteHeader = () => {
  return (
    <header className="sticky top-0 z-20 flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background/80 px-3 backdrop-blur md:px-4">
      <SidebarTrigger
        className="-ml-1 md:hidden"
        aria-label="Toggle sidebar"
      />
      <Link
        href="/"
        className="flex min-w-0 items-center gap-2 md:hidden"
        aria-label="tfl-components home"
      >
        <TfLRoundel className="size-5 shrink-0" />
        <span className="truncate text-sm font-medium text-foreground">
          tfl-components
        </span>
      </Link>
      <nav
        className="ml-auto flex shrink-0 gap-3 text-sm"
        aria-label="Secondary"
      >
        <Link
          href="/installation"
          className="text-muted-foreground hover:text-foreground"
        >
          Install
        </Link>
        <a
          href="https://github.com/ghcpuman902/tfl-components"
          className="text-muted-foreground hover:text-foreground"
          target="_blank"
          rel="noreferrer"
        >
          GitHub
        </a>
      </nav>
    </header>
  );
};
