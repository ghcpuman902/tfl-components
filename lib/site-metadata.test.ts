import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { SITE_NAME, SITE_TAGLINE, SITE_URL } from "./site"
import { docsEntryMetadata, pageMetadata, ROUTE_PAGE_META } from "./site-metadata"

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

  it("does not reuse the site name as every page's Open Graph title", () => {
    const titles = REQUIRED_ROUTES.map(
      (key) => pageMetadata(ROUTE_PAGE_META[key]).openGraph?.title
    )
    const unique = new Set(titles)
    assert.ok(unique.size > 1)
    assert.equal(
      pageMetadata({ ...ROUTE_PAGE_META.home, absoluteTitle: true }).openGraph
        ?.title,
      SITE_NAME
    )
  })

  it("leads the home description with the homepage fold line", () => {
    assert.equal(
      ROUTE_PAGE_META.home.description.startsWith(SITE_TAGLINE),
      true
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
