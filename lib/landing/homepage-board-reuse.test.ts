import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, it } from "node:test"

// Regression for Mangle's 18 Nov 2026 complaint: the homepage invented its own
// Board rows instead of the live Board, and the search was rounded, filled and
// painted over the site nav.

const root = join(dirname(fileURLToPath(import.meta.url)), "../..")
const read = (relative: string) => readFileSync(join(root, relative), "utf8")

const ROUNDING = /\brounded(-[\w[\]./%-]+)?\b|border-radius/

const zIndexOf = (source: string, marker: RegExp): number => {
  const match = source.match(marker)
  assert.ok(match, `no ${marker} in source`)
  return Number(match[1])
}

describe("homepage reuses the live Board", () => {
  const product = read("components/home/home-product.tsx")

  it("renders the live RailArrivalsBoard and BusArrivalsBoard", () => {
    assert.match(product, /from "@\/components\/tfl\/arrivals\/rail-arrivals-board"/)
    assert.match(product, /from "@\/components\/tfl\/arrivals\/bus-arrivals-board"/)
    assert.match(product, /<RailArrivalsBoard\b/)
    assert.match(product, /<BusArrivalsBoard\b/)
    assert.match(product, /lookupBoardStationLineGroups\(/)
  })

  it("no longer has the homepage-only Board view", () => {
    assert.equal(existsSync(join(root, "components/home/board-view.tsx")), false)
    assert.doesNotMatch(product, /board-view"|StationBoardView|BusBoardView/)
  })
})

describe("homepage search field", () => {
  const search = read("components/home/place-search.tsx")
  const page = read("app/page.tsx")

  it("adds no rounding on the search, its list or the page fallback", () => {
    assert.doesNotMatch(search, ROUNDING)
    assert.doesNotMatch(page, ROUNDING)
    assert.doesNotMatch(read("components/home/home-product.tsx"), ROUNDING)
  })

  it("has no fill in its default state", () => {
    assert.doesNotMatch(search, /rounded-\[14px\] bg-muted|"flex items-center gap-3[^"]*\bbg-muted\b/)
  })

  it("sits below the sticky site header", () => {
    const header = read("components/site-header.tsx")
    const headerZ = zIndexOf(header, /<header[\s\S]*?className="[^"]*\bsticky\b[^"]*\bz-(\d+)\b/)
    const searchZ = zIndexOf(search, /<div className="relative z-(\d+)"/)
    assert.ok(searchZ < headerZ, `search z-${searchZ} must be below header z-${headerZ}`)
    assert.ok(searchZ > 10, "search must still stack over the Board's own z-10 layers")
  })
})
