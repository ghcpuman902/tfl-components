import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, it } from "node:test"
import {
  DESKTOP_PRIMARY_LINKS,
  DOCS_NAV_ARIA_LABEL,
  DOCS_NAV_MOBILE_SUBTEXT,
  DOCS_NAV_TOOLTIP,
  HEADER_OVERFLOW_POLICY,
  MOBILE_PRIMARY_LINKS,
  MORE_MENU_NAME,
  SITE_NAV_BREAKPOINTS,
  estimateMobileHeaderRowWidth,
  linkIsActive,
  mobileHeaderFits,
  moreItemsForPlacement,
  placementForWidth,
  primaryLinksForPlacement,
  showMoreForPlacement,
} from "./site-nav"

describe("site navigation", () => {
  it("uses Docs, Components, Explorer, Labs, Board on desktop, with Board last", () => {
    assert.deepEqual(
      primaryLinksForPlacement("desktop").map((link) => link.label),
      ["Docs", "Components", "Explorer", "Labs", "Board"]
    )
    assert.equal(showMoreForPlacement("desktop"), false)
  })

  it("keeps desktop first and last on mobile, with More after them", () => {
    const desktop = primaryLinksForPlacement("desktop")
    assert.deepEqual(
      primaryLinksForPlacement("mobile").map((link) => link.label),
      [desktop[0].label, desktop[desktop.length - 1].label]
    )
    assert.equal(MORE_MENU_NAME, "More")
    assert.equal(showMoreForPlacement("mobile"), true)
  })

  it("treats 320px and 390px as mobile and tablet width as desktop", () => {
    assert.equal(placementForWidth(SITE_NAV_BREAKPOINTS.mobileNarrow), "mobile")
    assert.equal(placementForWidth(SITE_NAV_BREAKPOINTS.mobile), "mobile")
    assert.equal(placementForWidth(SITE_NAV_BREAKPOINTS.tablet), "desktop")
    assert.equal(placementForWidth(1024), "desktop")
  })

  it("fits wordmark, Docs, Board, More, and theme on a 320px header row", () => {
    assert.ok(mobileHeaderFits(SITE_NAV_BREAKPOINTS.mobileNarrow))
    assert.ok(mobileHeaderFits(SITE_NAV_BREAKPOINTS.mobile))
    assert.ok(
      estimateMobileHeaderRowWidth() <= SITE_NAV_BREAKPOINTS.mobileNarrow
    )
  })

  it("keeps the mobile header to three short labels", () => {
    const labels = [
      ...MOBILE_PRIMARY_LINKS.map((link) => link.label),
      MORE_MENU_NAME,
    ]
    assert.equal(labels.length, 3)
    assert.ok(labels.every((label) => label.length <= 8))
    assert.ok(DESKTOP_PRIMARY_LINKS.length >= 4)
  })

  it("puts Components, Explorer, Labs, and GitHub in More on mobile only", () => {
    const labels = moreItemsForPlacement("mobile").map((item) => item.label)
    assert.deepEqual(labels, ["Components", "Explorer", "Labs", "GitHub"])
  })

  it("does not render More in the desktop header", () => {
    const header = readFileSync(
      join(
        dirname(fileURLToPath(import.meta.url)),
        "../components/site-header.tsx"
      ),
      "utf8"
    )
    assert.doesNotMatch(header, /placement="desktop"/)
    assert.match(header, /<Sheet /)
    assert.match(header, /variant="mobile"/)
    assert.match(header, /includeSearch=\{!docsNav\}/)
    assert.match(header, /sticky top-\(--site-header-height\)[\s\S]*md:hidden/)
    assert.match(header, /w-full max-w-none/)
    assert.doesNotMatch(header, /DropdownMenu/)
  })

  it("exposes keyboard and pointer targets for More items", () => {
    for (const item of moreItemsForPlacement("mobile")) {
      assert.ok(item.href)
      assert.ok(item.label)
      assert.equal(
        typeof item.external,
        item.external ? "boolean" : "undefined"
      )
    }
  })

  it("does not use a horizontally scrolling primary nav", () => {
    const header = readFileSync(
      join(
        dirname(fileURLToPath(import.meta.url)),
        "../components/site-header.tsx"
      ),
      "utf8"
    )
    assert.doesNotMatch(header, /overflow-x-auto/)
    assert.match(header, /aria-label=\{MORE_MENU_NAME\}/)
    assert.match(header, /tfl-components/)
    assert.match(header, /HeaderRoundel/)
    assert.doesNotMatch(header, /TfLRoundel/)
    assert.match(header, /ml-auto flex min-w-0 shrink items-center/)
    assert.match(header, /GITHUB_REPO/)
    assert.match(header, /Star on GitHub/)
    assert.match(header, /ml-1 hidden shrink-0 md:inline-flex/)
    assert.match(header, /pr-1 pl-4/)
    assert.match(header, /flex-nowrap/)
    assert.doesNotMatch(header, /md:ml-2\.5/)
    assert.equal(header.match(/ml-auto/g)?.length, 1)
    assert.doesNotMatch(header, /hidden truncate[\s\S]*md:inline/)
    assert.equal(HEADER_OVERFLOW_POLICY.neverScrollNav, true)
    assert.deepEqual(HEADER_OVERFLOW_POLICY.shrinkOrder, [
      "search-hint",
      "search-width",
      "wordmark",
    ])
  })

  it("follows the system theme until the visitor chooses light or dark", () => {
    const provider = readFileSync(
      join(
        dirname(fileURLToPath(import.meta.url)),
        "../components/theme-provider.tsx"
      ),
      "utf8"
    )
    const toggle = readFileSync(
      join(
        dirname(fileURLToPath(import.meta.url)),
        "../components/theme-toggle.tsx"
      ),
      "utf8"
    )
    assert.match(provider, /defaultTheme="system"/)
    assert.match(provider, /enableSystem/)
    assert.match(
      toggle,
      /setTheme\(resolvedTheme === "dark" \? "light" : "dark"\)/
    )
  })

  it("mounts the Docs tooltip on the Link via Base UI render, not asChild", () => {
    const header = readFileSync(
      join(
        dirname(fileURLToPath(import.meta.url)),
        "../components/site-header.tsx"
      ),
      "utf8"
    )
    assert.match(header, /link\.tooltip/)
    assert.match(header, /TooltipTrigger/)
    assert.match(header, /render=\{/)
    assert.doesNotMatch(header, /asChild>\{linkEl\}/)
  })

  it("keeps the Docs label and describes the component-library path", () => {
    const docs = DESKTOP_PRIMARY_LINKS.find((link) => link.match === "docs")
    assert.equal(docs?.label, "Docs")
    assert.equal(docs?.tooltip, DOCS_NAV_TOOLTIP)
    assert.equal(docs?.ariaLabel, DOCS_NAV_ARIA_LABEL)
    assert.equal(docs?.mobileSubtext, DOCS_NAV_MOBILE_SUBTEXT)
    assert.equal("prominence" in (docs ?? {}), false)
  })

  it("keeps Board last in the J6 list without button chrome", () => {
    const board = DESKTOP_PRIMARY_LINKS[DESKTOP_PRIMARY_LINKS.length - 1]
    assert.equal(board.label, "Board")
    assert.equal("prominence" in board, false)
    assert.deepEqual(
      DESKTOP_PRIMARY_LINKS.map((link) => link.label),
      ["Docs", "Components", "Explorer", "Labs", "Board"]
    )
    const header = readFileSync(
      join(
        dirname(fileURLToPath(import.meta.url)),
        "../components/site-header.tsx"
      ),
      "utf8"
    )
    assert.doesNotMatch(header, /link\.prominence/)
    assert.doesNotMatch(header, /isAction/)
    assert.match(header, /underline-offset-\[6px\]/)
  })

  it("marks Labs and Board routes without treating Labs as a primary docs page", () => {
    assert.equal(linkIsActive("/labs", "labs"), true)
    assert.equal(linkIsActive("/labs/week-ahead", "labs"), true)
    assert.equal(linkIsActive("/board", "board"), true)
    assert.equal(linkIsActive("/docs", "docs"), true)
    assert.equal(linkIsActive("/docs/components", "docs"), false)
  })
})
