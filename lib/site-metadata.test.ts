import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  BOARD_HOME_DESCRIPTION,
  BOARD_HOME_TITLE,
  BOARD_SITE_NAME,
  SITE_TITLE_TEMPLATE,
  SITE_URL,
} from "./site"
import {
  boardViewPageMetadata,
  docsEntryMetadata,
  pageMetadata,
  ROUTE_PAGE_META,
} from "./site-metadata"
import { BOARD_VIEW_MANIFEST_PATH } from "./tfl/board-view-manifest"

const REQUIRED_ROUTES = [
  "home",
  "docs",
  "boardUrl",
  "components",
  "explorer",
  "board",
  "boardView",
  "labs",
  "licence",
  "credits",
  "accessibility",
  "privacy",
  "howItWasBuilt",
] as const

describe("route metadata", () => {
  it("covers the listed public routes", () => {
    for (const key of REQUIRED_ROUTES) {
      assert.ok(ROUTE_PAGE_META[key], key)
    }
  })

  it("sets a specific title, description, canonical, and social tags", () => {
    for (const key of REQUIRED_ROUTES) {
      const input = ROUTE_PAGE_META[key]
      const absolute = key === "home"
      const meta = pageMetadata({ ...input, absoluteTitle: absolute })
      const expectedUrl =
        input.path === "/" ? SITE_URL : `${SITE_URL}${input.path}`

      assert.notEqual(meta.openGraph?.title, undefined, key)
      if (key !== "home") {
        assert.notEqual(
          meta.openGraph?.title,
          "tfl-components",
          `${key} og:title`
        )
        assert.equal(meta.title, input.title, key)
      }
      assert.equal(meta.description, input.description, key)
      assert.equal(meta.alternates?.canonical, expectedUrl, key)
      assert.equal(meta.openGraph?.title, input.title, key)
      assert.equal(meta.openGraph?.description, input.description, key)
      assert.equal(meta.openGraph?.url, expectedUrl, key)
      assert.equal(meta.twitter?.title, input.title, key)
      assert.equal(meta.twitter?.description, input.description, key)
      assert.equal(meta.twitter?.card, "summary_large_image", key)
    }
  })

  it("keeps the Board display canonical free of configuration and keys", () => {
    const meta = pageMetadata(ROUTE_PAGE_META.boardView)
    const canonical = String(meta.alternates?.canonical)
    assert.equal(canonical, `${SITE_URL}/board/view`)
    assert.doesNotMatch(canonical, /[?#]/)
    assert.doesNotMatch(canonical, /key=/)
    assert.doesNotMatch(JSON.stringify(meta), /key=/)
  })

  it("points the Board display at the fullscreen home-screen manifest", () => {
    const meta = boardViewPageMetadata()
    const apple =
      typeof meta.appleWebApp === "object" ? meta.appleWebApp : undefined
    assert.equal(meta.manifest, BOARD_VIEW_MANIFEST_PATH)
    assert.equal(apple?.capable, true)
    assert.equal(apple?.statusBarStyle, "black-translucent")
    assert.equal(meta.other?.["mobile-web-app-capable"], "yes")
  })

  it("does not reuse one title as every page's Open Graph title", () => {
    const titles = REQUIRED_ROUTES.map(
      (key) => pageMetadata(ROUTE_PAGE_META[key]).openGraph?.title
    )
    const unique = new Set(titles)
    assert.ok(unique.size > 1)
    const home = pageMetadata({
      ...ROUTE_PAGE_META.home,
      absoluteTitle: true,
    })
    assert.equal(home.openGraph?.title, BOARD_HOME_TITLE)
    assert.equal(home.openGraph?.siteName, BOARD_SITE_NAME)
    assert.equal(home.twitter?.card, "summary_large_image")
    assert.deepEqual(home.title, { absolute: BOARD_HOME_TITLE })
    assert.equal(SITE_TITLE_TEMPLATE, "%s · Board")
  })

  it("uses a concise Board description on the homepage", () => {
    assert.equal(ROUTE_PAGE_META.home.description, BOARD_HOME_DESCRIPTION)
    assert.equal(ROUTE_PAGE_META.home.title, BOARD_HOME_TITLE)
  })

  it("gives catalogue pages a canonical URL and social tags", () => {
    const meta = docsEntryMetadata("tube-rail-arrivals")
    assert.equal(meta.title, "Tube & Rail Arrivals")
    assert.equal(
      meta.alternates?.canonical,
      `${SITE_URL}/docs/tube-rail-arrivals`
    )
    assert.equal(meta.openGraph?.url, `${SITE_URL}/docs/tube-rail-arrivals`)
    assert.equal(meta.twitter?.card, "summary_large_image")
  })
})
