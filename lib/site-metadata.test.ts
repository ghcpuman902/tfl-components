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
  SOCIAL_IMAGE,
} from "./site-metadata"
import { DOCS_ENTRIES } from "./docs-catalog"
import { COMPARE_ALTERNATIVES } from "./compare/alternatives"
import { OG_IMAGE, OG_IMAGE_URL } from "./og/image"
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
      assert.deepEqual(
        meta.openGraph?.images,
        [SOCIAL_IMAGE],
        `${key} og:image`
      )
      assert.deepEqual(
        meta.twitter?.images,
        [{ url: OG_IMAGE_URL, alt: OG_IMAGE.alt }],
        `${key} twitter:image`
      )
    }
  })

  it("points the social image at the opengraph-image route", () => {
    assert.equal(SOCIAL_IMAGE.url, `${SITE_URL}/opengraph-image`)
    assert.equal(SOCIAL_IMAGE.width, 1200)
    assert.equal(SOCIAL_IMAGE.height, 630)
    assert.ok(docsEntryMetadata("ipad-dashboard").openGraph?.images)
    assert.ok(docsEntryMetadata("tv").twitter?.images)
  })

  it("cites a public source for every /compare row", () => {
    assert.ok(COMPARE_ALTERNATIVES.length >= 7)
    for (const item of COMPARE_ALTERNATIVES) {
      assert.ok(item.sources.length > 0, item.id)
      for (const source of item.sources) {
        assert.match(source.url, /^https:\/\//, `${item.id} ${source.url}`)
      }
      for (const text of [item.kind, item.cost, item.tflData, item.goodFit]) {
        assert.doesNotMatch(text, /\bbest\b|[–—]/i, item.id)
      }
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
    assert.equal(
      BOARD_HOME_TITLE,
      "Board · live London Tube & bus departures for any screen"
    )
  })

  it("separates title clauses with a middle dot", () => {
    const titles = [
      BOARD_HOME_TITLE,
      ...Object.values(ROUTE_PAGE_META).map((meta) => meta.title),
      ...DOCS_ENTRIES.map((entry) => entry.title),
    ]
    for (const title of titles) {
      assert.doesNotMatch(title, /[–—]/, title)
    }
    assert.equal(
      docsEntryMetadata("maps-geographic").openGraph?.title,
      "Map · Tube & Rail (Geo)"
    )
    assert.equal(
      docsEntryMetadata("maps-bus").twitter?.title,
      "Map · Bus (Geo)"
    )
    assert.equal(
      docsEntryMetadata("branch-strip-horizontal").title,
      "Branch strip · horizontal"
    )
    assert.equal(
      docsEntryMetadata("branch-strip-vertical").title,
      "Branch strip · vertical"
    )
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
