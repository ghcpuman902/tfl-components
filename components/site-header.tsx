"use client"

import { useState, type ReactNode } from "react"
import Link, { useLinkStatus } from "next/link"
import { FlaskConical, Telescope } from "lucide-react"
import { DocsSearch } from "@/components/docs/docs-search"
import { ThemeToggle } from "@/components/theme-toggle"
import { newMarkerParentClassName } from "@/components/new-marker"
import { buttonVariants } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { HeaderRoundel } from "@/components/site-header-roundel"
import { GITHUB_REPO } from "@/lib/feedback/constants"
import { cn } from "@/lib/utils"
import {
  DOCS_SIDEBAR_TRIGGER_LABEL,
  MORE_MENU_NAME,
  moreItemsForPlacement,
  primaryLinksForPlacement,
  linkIsActive,
  type SiteNavLink,
  type SiteMoreItem,
} from "@/lib/site-nav"

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

type SiteHeaderProps = {
  /** Current pathname — passed from chrome so Suspense fallbacks stay hook-free. */
  pathname: string
  /** Docs routes: sidebar trigger sits in this header row, left of the logo. */
  docsNav?: boolean
}

const HeaderLink = ({
  link,
  pathname,
  compact,
  className,
}: {
  link: SiteNavLink
  pathname: string
  compact?: boolean
  className?: string
}) => {
  const active = linkIsActive(pathname, link.match)
  const label = (
    <>
      <NavLinkLabel>{link.label}</NavLinkLabel>
      {link.mobileSubtext && compact ? (
        <span className="sr-only">{link.mobileSubtext}</span>
      ) : null}
    </>
  )

  const linkClassName = cn(
    "shrink-0 px-1.5 py-2",
    link.match === "board" &&
      newMarkerParentClassName("after:top-0.5 after:right-0"),
    active
      ? "font-medium text-foreground underline decoration-1 underline-offset-[6px]"
      : "text-muted-foreground hover:text-foreground",
    className
  )

  if (!link.tooltip) {
    return (
      <Link
        href={link.href}
        className={linkClassName}
        aria-label={link.ariaLabel}
      >
        {label}
      </Link>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Link
            href={link.href}
            className={linkClassName}
            aria-label={link.ariaLabel}
          />
        }
      >
        {label}
      </TooltipTrigger>
      <TooltipContent>{link.tooltip}</TooltipContent>
    </Tooltip>
  )
}

const MoreMenu = ({ includeSearch }: { includeSearch: boolean }) => {
  const [open, setOpen] = useState(false)
  const items = moreItemsForPlacement("mobile")

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className="shrink-0 px-1.5 py-2 text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        aria-label={MORE_MENU_NAME}
      >
        {MORE_MENU_NAME}
      </SheetTrigger>
      <SheetContent
        side="top"
        className="inset-x-0 top-(--site-header-height) h-auto max-h-[min(32rem,calc(100dvh-var(--site-header-height)))] w-full max-w-none gap-0 overflow-y-auto rounded-none px-4 pt-4 pb-4 sm:max-w-none"
      >
        <SheetHeader className="p-0">
          <SheetTitle className="sr-only">{MORE_MENU_NAME}</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1" aria-label={MORE_MENU_NAME}>
          {items.map((item) => (
            <MoreMenuItem key={`${item.label}-${item.href}`} item={item} />
          ))}
        </nav>
        {includeSearch ? (
          <div className="mt-4 border-t border-border pt-4">
            <DocsSearch variant="mobile" onNavigate={() => setOpen(false)} />
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

const GitHubMark = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden>
    <path
      fill="currentColor"
      d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
    />
  </svg>
)

const GitHubLink = ({ className }: { className?: string }) => (
  <a
    href={GITHUB_REPO}
    target="_blank"
    rel="noreferrer"
    className={cn(
      buttonVariants({ variant: "ghost", size: "sm" }),
      "gap-1.5 px-2 text-sm font-normal text-muted-foreground",
      className
    )}
  >
    <GitHubMark className="block size-3.5" />
    <span className="leading-none [text-box:trim-both_cap_alphabetic]">
      Star on GitHub
    </span>
  </a>
)

const moreItemClassName =
  "flex w-full items-center gap-2 rounded-md px-2 py-2.5 text-left text-sm text-foreground hover:bg-muted"

const moreItemIcon = (label: string): ReactNode => {
  const iconClassName = "size-4 shrink-0 text-muted-foreground"
  if (label === "Explorer") {
    return <Telescope className={iconClassName} aria-hidden />
  }
  if (label === "Labs") {
    return <FlaskConical className={iconClassName} aria-hidden />
  }
  if (label === "GitHub") {
    return <GitHubMark className={iconClassName} />
  }
  return null
}

const MoreMenuItem = ({ item }: { item: SiteMoreItem }) => {
  const label = (
    <>
      {item.label}
      {moreItemIcon(item.label)}
    </>
  )

  if (item.external) {
    return (
      <SheetClose
        nativeButton={false}
        render={
          <a
            href={item.href}
            target="_blank"
            rel="noreferrer"
            className={moreItemClassName}
          />
        }
      >
        {label}
      </SheetClose>
    )
  }

  return (
    <SheetClose
      nativeButton={false}
      render={<Link href={item.href} className={moreItemClassName} />}
    >
      {label}
    </SheetClose>
  )
}

export const SiteHeader = ({ pathname, docsNav = false }: SiteHeaderProps) => {
  const desktopLinks = primaryLinksForPlacement("desktop")
  const mobileLinks = primaryLinksForPlacement("mobile")

  return (
    <>
      <header className="sticky top-0 z-30 box-border h-(--site-header-height) w-full overflow-x-clip border-b border-border bg-background/60 backdrop-blur backdrop-brightness-110 backdrop-saturate-150">
        {/* pl-4 to the logo. pr-2.5 plus the 6px icon-sm inset matches that 16px visual edge gap. */}
        <div className="flex h-full min-w-0 flex-nowrap items-center gap-1 overflow-x-clip pr-1 pl-4 md:gap-2">
          {docsNav ? (
            <SidebarTrigger
              aria-label={DOCS_SIDEBAR_TRIGGER_LABEL}
              className="relative z-10 -ml-1.5 size-7 shrink-0 md:hidden"
            />
          ) : null}
          <Link
            href="/"
            className="flex min-w-0 shrink items-center gap-2 md:shrink-0"
            aria-label="tfl-components home"
          >
            <HeaderRoundel className="size-5 shrink-0" />
            <span className="truncate text-sm font-medium tracking-tight text-foreground">
              tfl-components
            </span>
          </Link>

          <nav
            className="flex shrink-0 items-center text-sm md:hidden"
            aria-label="Primary"
          >
            {mobileLinks.map((link) => (
              <HeaderLink
                key={link.href}
                link={link}
                pathname={pathname}
                compact
              />
            ))}
            <MoreMenu includeSearch={!docsNav} />
          </nav>

          <nav
            className="hidden shrink-0 items-center text-sm md:flex"
            aria-label="Primary"
          >
            {desktopLinks.map((link) => (
              <HeaderLink key={link.href} link={link} pathname={pathname} />
            ))}
          </nav>

          <div className="ml-auto flex min-w-0 shrink items-center">
            <DocsSearch
              variant="header"
              className="hidden w-44 max-w-56 min-w-28 shrink md:block lg:w-52"
            />
            <GitHubLink className="ml-1 hidden shrink-0 md:inline-flex" />
            <ThemeToggle className="shrink-0" />
          </div>
        </div>
      </header>
      {docsNav ? (
        <div className="sticky top-(--site-header-height) z-20 border-b border-border bg-background/60 px-4 py-2 backdrop-blur backdrop-brightness-110 backdrop-saturate-150 md:hidden">
          <DocsSearch variant="mobile" />
        </div>
      ) : null}
    </>
  )
}
