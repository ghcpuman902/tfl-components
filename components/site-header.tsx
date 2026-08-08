"use client";

import Link from "next/link";
import { SidebarTrigger } from "@/components/ui/sidebar";

export const SiteHeader = () => {
  return (
    <header className="sticky top-0 z-20 flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background/80 px-3 backdrop-blur md:px-4">
      <SidebarTrigger className="-ml-1" aria-label="Toggle sidebar" />
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3">
        <p className="truncate text-sm text-muted-foreground md:hidden">
          <Link href="/" className="font-medium text-foreground">
            tfl-components
          </Link>
        </p>
        <p className="hidden text-sm text-muted-foreground md:block">
          Open React components for London transport · press{" "}
          <kbd className="rounded border px-1 text-xs">d</kbd> for dark mode
        </p>
        <nav className="flex shrink-0 gap-2 text-sm" aria-label="Secondary">
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
      </div>
    </header>
  );
};
