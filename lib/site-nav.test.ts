import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  DESKTOP_PRIMARY_LINKS,
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

  it("marks Labs and Board routes without treating Labs as a primary docs page", () => {
    assert.equal(linkIsActive("/labs", "labs"), true)
    assert.equal(linkIsActive("/labs/week-ahead", "labs"), true)
    assert.equal(linkIsActive("/board", "board"), true)
    assert.equal(linkIsActive("/docs", "docs"), true)
    assert.equal(linkIsActive("/docs/components", "docs"), false)
  })
})
