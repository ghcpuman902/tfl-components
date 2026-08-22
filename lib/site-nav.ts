import { GITHUB_REPO } from "@/lib/feedback/constants"

export const SITE_NAV_BREAKPOINTS = {
  mobileNarrow: 320,
  mobile: 390,
  tablet: 768,
} as const

export type SiteNavPlacement = "desktop" | "mobile"

export type SiteNavLink = {
  href: string
  label: string
  match: "docs" | "components" | "explorer" | "board" | "labs"
  /** Compact labels used in the 320px header row. */
  shortLabel?: string
  tooltip?: string
  ariaLabel?: string
  mobileSubtext?: string
}

export type SiteMoreItem = {
  href: string
  label: string
  external?: boolean
  /** Shown in More on mobile even when the same destination is top-level on desktop. */
  mobileOnly?: boolean
}

export const DOCS_NAV_TOOLTIP = "React component documentation"
export const DOCS_NAV_ARIA_LABEL = "Docs: React component library"
export const DOCS_NAV_MOBILE_SUBTEXT = "Documentation for the component library"
export const DOCS_SIDEBAR_TRIGGER_LABEL = "Open documentation navigation"

/**
 * Desktop order stays Docs first and Board last (frozen J6).
 * Active item uses an underline — no filled/outline button chrome.
 */
export const DESKTOP_PRIMARY_LINKS: readonly SiteNavLink[] = [
  {
    href: "/docs",
    label: "Docs",
    match: "docs",
    tooltip: DOCS_NAV_TOOLTIP,
    ariaLabel: DOCS_NAV_ARIA_LABEL,
    mobileSubtext: DOCS_NAV_MOBILE_SUBTEXT,
  },
  { href: "/docs/components", label: "Components", match: "components" },
  { href: "/docs/explorer", label: "Explorer", match: "explorer" },
  { href: "/labs", label: "Labs", match: "labs" },
  { href: "/board", label: "Board", match: "board" },
]

/** Mobile keeps the desktop first and last items. More follows them. */
export const MOBILE_PRIMARY_LINKS: readonly SiteNavLink[] = [
  DESKTOP_PRIMARY_LINKS[0],
  DESKTOP_PRIMARY_LINKS[DESKTOP_PRIMARY_LINKS.length - 1],
]

export const MORE_MENU_NAME = "More"

const desktopMiddleLinks = DESKTOP_PRIMARY_LINKS.slice(1, -1)

/** Middle desktop destinations, plus GitHub. Shown in More on mobile. */
export const MORE_MENU_ITEMS: readonly SiteMoreItem[] = [
  ...desktopMiddleLinks.map((link) => ({
    href: link.href,
    label: link.label,
    mobileOnly: true,
  })),
  { href: GITHUB_REPO, label: "GitHub", external: true },
]

export const primaryLinksForPlacement = (
  placement: SiteNavPlacement
): readonly SiteNavLink[] =>
  placement === "mobile" ? MOBILE_PRIMARY_LINKS : DESKTOP_PRIMARY_LINKS

export const moreItemsForPlacement = (
  placement: SiteNavPlacement
): readonly SiteMoreItem[] =>
  MORE_MENU_ITEMS.filter((item) => placement === "mobile" || !item.mobileOnly)

/** More is the mobile overflow menu. Desktop shows the primary links, including Labs. */
export const showMoreForPlacement = (placement: SiteNavPlacement): boolean =>
  placement === "mobile"

export const placementForWidth = (width: number): SiteNavPlacement =>
  width < SITE_NAV_BREAKPOINTS.tablet ? "mobile" : "desktop"

/**
 * When the header row is short of space, shrink in this order.
 * The primary nav never wraps or scrolls horizontally.
 */
export const HEADER_OVERFLOW_POLICY = {
  neverScrollNav: true,
  shrinkOrder: ["search-hint", "search-width", "wordmark"] as const,
} as const

/**
 * Conservative header-row budget for the mobile primary row:
 * wordmark + Docs + Board + More + theme toggle, no scrolling nav.
 * Docs keeps the wordmark and a compact sidebar trigger.
 */
export const DOCS_SIDEBAR_TRIGGER_PX = 28

export const estimateMobileHeaderRowWidth = (options?: {
  paddingInlineStartPx?: number
  paddingInlineEndPx?: number
  logoPx?: number
  logoGapPx?: number
  wordmarkPx?: number
  itemPaddingX?: number
  gapPx?: number
  themeTogglePx?: number
  charPx?: number
  docsSidebarTriggerPx?: number
}): number => {
  const paddingInlineStartPx = options?.paddingInlineStartPx ?? 16
  const paddingInlineEndPx = options?.paddingInlineEndPx ?? 10
  const logoPx = options?.logoPx ?? 20
  const logoGapPx = options?.logoGapPx ?? 8
  const wordmarkPx = options?.wordmarkPx ?? 98
  const itemPaddingX = options?.itemPaddingX ?? 12
  const gapPx = options?.gapPx ?? 4
  const themeTogglePx = options?.themeTogglePx ?? 28
  const charPx = options?.charPx ?? 7
  const docsSidebarTriggerPx = options?.docsSidebarTriggerPx ?? 0
  const labels = [
    ...MOBILE_PRIMARY_LINKS.map((link) => link.label),
    MORE_MENU_NAME,
  ]
  const linksWidth = labels.reduce(
    (sum, label) => sum + label.length * charPx + itemPaddingX,
    0
  )
  return (
    paddingInlineStartPx +
    (docsSidebarTriggerPx > 0 ? docsSidebarTriggerPx + gapPx : 0) +
    logoPx +
    logoGapPx +
    wordmarkPx +
    gapPx +
    linksWidth +
    gapPx +
    themeTogglePx +
    paddingInlineEndPx
  )
}

/** Docs mobile header keeps the wordmark and a compact sidebar trigger. */
export const estimateDocsMobileHeaderRowWidth = (): number =>
  estimateMobileHeaderRowWidth({
    docsSidebarTriggerPx: DOCS_SIDEBAR_TRIGGER_PX,
  })

export const mobileHeaderFits = (viewportWidth: number): boolean =>
  estimateMobileHeaderRowWidth() <= viewportWidth

export const linkIsActive = (pathname: string, match: SiteNavLink["match"]) => {
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
  if (match === "labs") {
    return pathname === "/labs" || pathname.startsWith("/labs/")
  }
  return pathname === `/${match}` || pathname.startsWith(`/${match}/`)
}
