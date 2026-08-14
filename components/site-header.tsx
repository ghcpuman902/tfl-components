"use client"

import Link from "next/link"
import { DocsSearch } from "@/components/docs/docs-search"
import { newMarkerParentClassName } from "@/components/new-marker"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { TfLRoundel } from "@/components/tfl/brand/tfl-roundel"
import { useHorizontalScrollEnd } from "@/hooks/use-horizontal-scroll-end"
import { cn } from "@/lib/utils"

const GITHUB = "https://github.com/ghcpuman902/tfl-components"

const GitHubLink = ({ className }: { className?: string }) => (
  <a
    href={GITHUB}
    className={cn(
      "shrink-0 px-1.5 py-2 text-muted-foreground hover:text-foreground",
      className
    )}
    target="_blank"
    rel="noreferrer"
  >
    GitHub
  </a>
)

const PRIMARY_LINKS = [
  { href: "/docs", label: "Docs", match: "docs" },
  { href: "/docs/components", label: "Components", match: "components" },
  { href: "/blocks", label: "Blocks", match: "blocks" },
  { href: "/docs/explorer", label: "Explorer", match: "explorer" },
  { href: "/board", label: "Board", match: "board", isNew: true },
] as const

type SiteHeaderProps = {
  /** Current pathname — passed from chrome so Suspense fallbacks stay hook-free. */
  pathname: string
  /** Show mobile sidebar trigger (docs shell only). */
  showSidebarTrigger?: boolean
}

const linkIsActive = (
  pathname: string,
  match: (typeof PRIMARY_LINKS)[number]["match"]
) => {
  if (match === "components") {
    return (
      pathname === "/docs/components" ||
      pathname.startsWith("/docs/components/")
    )
  }
  if (match === "explorer") {
    return (
      pathname === "/docs/explorer" ||
      pathname.startsWith("/docs/explorer/") ||
      pathname === "/explore" ||
      pathname.startsWith("/explore/")
    )
  }
  if (match === "docs") {
    return (
      pathname.startsWith("/docs") &&
      !pathname.startsWith("/docs/components") &&
      !pathname.startsWith("/docs/explorer")
    )
  }
  return pathname === `/${match}` || pathname.startsWith(`/${match}/`)
}

export const SiteHeader = ({
  pathname,
  showSidebarTrigger = false,
}: SiteHeaderProps) => {
  const { scrollRef, showEndFade } = useHorizontalScrollEnd<HTMLElement>()

  return (
    <header className="sticky top-0 z-30 box-border h-(--site-header-height) w-full border-b border-border bg-background/80 backdrop-blur">
      {/* Match sidebar content inset: group p-2 + label/button px-2 → 16px. */}
      <div className="flex h-full items-center gap-2 px-4 md:gap-4">
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
          <span className="hidden truncate text-sm font-medium text-foreground md:inline">
            tfl-components
          </span>
        </Link>

        <div className="relative min-w-0 flex-1">
          <nav
            ref={scrollRef}
            className="flex min-w-0 scrollbar-none items-center gap-2 overflow-x-auto overscroll-x-contain pr-10 text-sm md:gap-3"
            aria-label="Primary"
          >
            {PRIMARY_LINKS.map((link) => {
              const active = linkIsActive(pathname, link.match)
              const isNew = "isNew" in link && link.isNew
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "shrink-0 px-1.5 py-2",
                    isNew && newMarkerParentClassName("pr-6 after:top-0.5"),
                    active
                      ? "font-medium text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {link.label}
                </Link>
              )
            })}
            <GitHubLink className="md:hidden" />
          </nav>
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-y-0 right-0 w-10 bg-linear-to-l from-background via-background/90 to-transparent transition-opacity duration-150 ease-[ease]",
              showEndFade ? "opacity-100" : "opacity-0"
            )}
          />
        </div>

        <div className="hidden w-56 shrink-0 md:block lg:w-64">
          <DocsSearch variant="header" />
        </div>

        <GitHubLink className="hidden text-sm md:inline" />
      </div>
    </header>
  )
}
