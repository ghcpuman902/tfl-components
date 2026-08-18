"use client"

import Link, { useLinkStatus } from "next/link"
import { DocsSearch } from "@/components/docs/docs-search"
import { ThemeToggle } from "@/components/theme-toggle"
import { newMarkerParentClassName } from "@/components/new-marker"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { TfLRoundel } from "@/components/tfl/brand/tfl-roundel"
import { cn } from "@/lib/utils"

const GITHUB = "https://github.com/ghcpuman902/tfl-components"

/**
 * Child of a `<Link>` — `useLinkStatus` only reports its own link's pending
 * transition. Dims the label so a click reads as "in progress" instead of
 * looking like nothing happened while the RSC payload streams in.
 */
const NavLinkLabel = ({ children }: { children: React.ReactNode }) => {
  const { pending } = useLinkStatus()
  return (
    <span className={cn("transition-opacity", pending && "opacity-50")}>
      {children}
    </span>
  )
}

const GitHubLink = ({ className }: { className?: string }) => (
  <a
    href={GITHUB}
    className={cn(
      "shrink-0 px-1.5 py-2 text-muted-foreground hover:text-foreground max-[380px]:px-1",
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
  return (
    <header className="sticky top-0 z-30 box-border h-(--site-header-height) w-full border-b border-border bg-background/60 backdrop-blur backdrop-saturate-150 backdrop-brightness-110">
      {/* Match sidebar content inset: group p-2 + label/button px-2 → 16px. */}
      <div className="flex h-full items-center pr-0 pl-4 md:pr-4">
        <div className="flex shrink-0 items-center gap-2 max-[380px]:gap-1">
          {showSidebarTrigger ? (
            <SidebarTrigger
              className="-ml-1 md:hidden"
              aria-label="Toggle sidebar"
            />
          ) : null}

          <Link
            href="/"
            className="flex min-w-0 items-center gap-2"
            aria-label="tfl-components home"
          >
            <TfLRoundel className="size-5 shrink-0" aria-hidden />
            <span className="hidden truncate text-sm font-medium text-foreground md:inline">
              tfl-components
            </span>
          </Link>
          <ThemeToggle className="md:hidden" />
        </div>

        <nav
          className={cn(
            "ml-2 flex min-w-0 grow basis-max scrollbar-none items-center gap-2 overflow-x-auto overscroll-x-contain text-sm max-[380px]:gap-0.5 md:ml-4 md:gap-3",
            "[--nav-end:8px] [--nav-fade:8px] pr-(--nav-end)",
            "mask-r-from-[calc(100%-var(--nav-end))] mask-r-to-[calc(100%-var(--nav-end)+var(--nav-fade))]"
          )}
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
                  "shrink-0 px-1.5 py-2 max-[380px]:px-1",
                  isNew && newMarkerParentClassName("pr-6 after:top-0.5"),
                  active
                    ? "font-medium text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <NavLinkLabel>{link.label}</NavLinkLabel>
              </Link>
            )
          })}
          <GitHubLink className="md:hidden" />
        </nav>

        <div className="hidden min-w-28 max-w-60 shrink-999 basis-60 md:flex md:items-center lg:max-w-68 lg:basis-68">
          <div className="w-4 min-w-0 shrink-2 basis-4" aria-hidden />
          <DocsSearch variant="header" className="min-w-0 grow basis-56" />
        </div>

        <GitHubLink className="ml-2 hidden text-sm md:ml-4 md:inline" />
        <ThemeToggle className="ml-1 hidden md:inline-flex" />
      </div>
    </header>
  )
}
