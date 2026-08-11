"use client";

import Link from "next/link";
import { DocsSearch } from "@/components/docs/docs-search";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { TfLRoundel } from "@/components/tfl/brand/tfl-roundel";
import { cn } from "@/lib/utils";

const GITHUB = "https://github.com/ghcpuman902/tfl-components";

const PRIMARY_LINKS = [
  { href: "/docs/installation", label: "Docs", match: "docs" },
  { href: "/docs/components", label: "Components", match: "components" },
  { href: "/blocks", label: "Blocks", match: "blocks" },
  { href: "/tools", label: "Tools", match: "tools" },
] as const;

type SiteHeaderProps = {
  /** Current pathname — passed from chrome so Suspense fallbacks stay hook-free. */
  pathname: string;
  /** Show mobile sidebar trigger (docs shell only). */
  showSidebarTrigger?: boolean;
};

const linkIsActive = (
  pathname: string,
  match: (typeof PRIMARY_LINKS)[number]["match"],
) => {
  if (match === "components") {
    return (
      pathname === "/docs/components" ||
      pathname.startsWith("/docs/components/")
    );
  }
  if (match === "docs") {
    return (
      pathname.startsWith("/docs") && !pathname.startsWith("/docs/components")
    );
  }
  return pathname === `/${match}` || pathname.startsWith(`/${match}/`);
};

export const SiteHeader = ({
  pathname,
  showSidebarTrigger = false,
}: SiteHeaderProps) => {
  return (
    <header className="sticky top-0 z-30 box-border h-(--site-header-height) w-full border-b border-border bg-background/80 backdrop-blur">
      {/* Match sidebar content inset: group p-2 + label/button px-2 → 16px. */}
      <div className="flex h-full items-center gap-3 px-4 md:gap-4">
        {showSidebarTrigger ? (
          <SidebarTrigger
            className="-ml-1 md:hidden"
            aria-label="Toggle sidebar"
          />
        ) : null}

        <Link
          href="/"
          className="flex min-w-0 shrink-0 items-center gap-2"
          aria-label="tfl-components home"
        >
          <TfLRoundel className="size-5 shrink-0" />
          <span className="truncate text-sm font-medium text-foreground">
            tfl-components
          </span>
        </Link>

        <nav
          className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto text-sm md:gap-3"
          aria-label="Primary"
        >
          {PRIMARY_LINKS.map((link) => {
            const active = linkIsActive(pathname, link.match);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "shrink-0",
                  active
                    ? "font-medium text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden min-w-0 max-w-sm flex-1 md:block md:max-w-md">
          <DocsSearch variant="header" />
        </div>

        <a
          href={GITHUB}
          className="shrink-0 text-sm text-muted-foreground hover:text-foreground"
          target="_blank"
          rel="noreferrer"
        >
          GitHub
        </a>
      </div>
    </header>
  );
};
