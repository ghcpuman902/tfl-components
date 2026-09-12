import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, it } from "node:test"
import {
  DOCS_SIDEBAR_TRIGGER_LABEL,
  DOCS_SIDEBAR_TRIGGER_PX,
  SITE_NAV_BREAKPOINTS,
  estimateDocsMobileHeaderRowWidth,
  estimateMobileHeaderRowWidth,
} from "./site-nav"

const root = dirname(fileURLToPath(import.meta.url))

const read = (relative: string) =>
  readFileSync(join(root, relative), "utf8")

describe("docs mobile sidebar trigger position", () => {
  const header = read("../components/site-header.tsx")
  const chrome = read("../components/docs/app-chrome.tsx")

  it("lives in the global header, left of the logo, never under the header", () => {
    assert.match(header, /docsNav/)
    assert.match(header, /SidebarTrigger/)
    assert.match(header, /flex-nowrap/)
    assert.match(header, /size-7 shrink-0 md:hidden/)
    assert.match(header, /md:hidden/)
    assert.match(header, /DOCS_SIDEBAR_TRIGGER_LABEL/)
    assert.equal(DOCS_SIDEBAR_TRIGGER_LABEL, "Open documentation navigation")
    assert.doesNotMatch(chrome, /SidebarTrigger/)
    assert.doesNotMatch(chrome, /Toggle sidebar/)
    assert.doesNotMatch(
      chrome,
      /flex items-center gap-2 border-b border-border px-4 py-2 md:hidden/
    )

    const triggerIndex = header.indexOf("SidebarTrigger")
    const logoIndex = header.indexOf("tfl-components home")
    assert.ok(triggerIndex > 0)
    assert.ok(logoIndex > triggerIndex)
  })

  it("keeps a compact trigger on the same header row as the wordmark", () => {
    assert.equal(DOCS_SIDEBAR_TRIGGER_PX, 28)
    assert.ok(estimateDocsMobileHeaderRowWidth() <= SITE_NAV_BREAKPOINTS.mobile)
    assert.ok(
      estimateMobileHeaderRowWidth({
        docsSidebarTriggerPx: DOCS_SIDEBAR_TRIGGER_PX,
      }) <= SITE_NAV_BREAKPOINTS.mobile
    )
    assert.doesNotMatch(
      header,
      /docsNav && "max-md:hidden"/
    )
  })

  it("opens the mobile sheet even before the viewport hook hydrates", () => {
    const sidebar = read("../components/ui/sidebar.tsx")
    const mobileHook = read("../hooks/use-mobile.ts")
    assert.match(sidebar, /isMobileViewport\(\)/)
    assert.match(mobileHook, /export const isMobileViewport/)
    assert.doesNotMatch(
      sidebar,
      /return isMobile \? setOpenMobile/
    )
  })

  it("does not render the trigger on tablet/desktop header widths", () => {
    assert.match(header, /className="relative z-10 -ml-1.5 size-7[\s\S]*md:hidden"/)
    assert.equal(SITE_NAV_BREAKPOINTS.tablet, 768)
  })

  it("keeps the drawer on Base UI modal defaults for focus trap, Escape, and scroll lock", () => {
    const sidebar = read("../components/ui/sidebar.tsx")
    const sheet = read("../components/ui/sheet.tsx")
    assert.match(sidebar, /<Sheet open=\{openMobile\}/)
    assert.doesNotMatch(sidebar, /modal=\{false\}/)
    assert.match(sheet, /Dialog as SheetPrimitive/)
    assert.doesNotMatch(sheet, /modal=\{false\}/)
  })

  it("does not move the trigger beside the breadcrumb", () => {
    const pageHeader = read("../components/docs/docs-page-header.tsx")
    assert.doesNotMatch(pageHeader, /SidebarTrigger/)
    assert.match(pageHeader, /text-sm text-muted-foreground/)
  })

  it("uses next/link for docs chrome without tooltip or title wrappers", () => {
    const sidebar = read("../components/docs/docs-sidebar.tsx")
    const actions = read("../components/docs/docs-page-actions.tsx")
    const pageHeader = read("../components/docs/docs-page-header.tsx")
    const primitive = read("../components/ui/sidebar.tsx")
    const docsLoading = read("../app/docs/loading.tsx")
    const pendingHint = read("../components/link-pending-hint.tsx")
    const docsLayout = read("../app/docs/layout.tsx")

    assert.match(sidebar, /from ["']next\/link["']/)
    assert.doesNotMatch(sidebar, /tooltip=\{entry\.title\}/)
    assert.match(
      sidebar,
      /<Link href=\{entry\.href\} onClick=\{onNavigate\}/
    )
    assert.match(sidebar, /LinkPendingHint/)
    assert.match(sidebar, /setOpenMobile\(false\)/)
    assert.match(pendingHint, /useLinkStatus/)
    assert.match(docsLayout, /export default function DocsLayout/)
    assert.match(docsLayout, /export const prefetch = "partial"/)
    assert.doesNotMatch(chrome, /NavigationPendingShell/)

    assert.match(actions, /from ["']next\/link["']/)
    assert.doesNotMatch(actions, /\btitle=\{/)
    assert.match(actions, /href=\{prev\.href\}/)
    assert.match(actions, /href=\{next\.href\}/)
    assert.match(actions, /touch-manipulation/)

    assert.match(pageHeader, /from ["']next\/link["']/)
    assert.match(pageHeader, /href="\/"/)
    assert.match(pageHeader, /href="\/docs"/)

    assert.match(
      primitive,
      /const showTooltip = Boolean\(tooltip\) && state === "collapsed" && !isMobile/
    )
    assert.match(primitive, /touch-manipulation/)
    assert.match(docsLoading, /export default function Loading/)
  })
})
