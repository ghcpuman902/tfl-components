import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, it } from "node:test"

// Regression for Mangle's 18 Nov 2026 complaint: the homepage invented its own
// Board rows instead of the live Board, and the search was filled and painted
// over the site nav. DROP SQUARE (22 Nov): rounding is required again; no fill stays.

const root = join(dirname(fileURLToPath(import.meta.url)), "../..")
const read = (relative: string) => readFileSync(join(root, relative), "utf8")

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
    assert.doesNotMatch(product, /components\/home\/board-view|StationBoardView|BusBoardView/)
  })
})

describe("homepage search field", () => {
  const search = read("components/home/place-search.tsx")

  it("keeps rounded line marks (DROP SQUARE)", () => {
    assert.match(search, /rounded-full bg-\(--line-color\)/)
  })

  it("has no fill in its default state", () => {
    assert.doesNotMatch(search, /rounded-\[14px\] bg-muted|"flex items-center gap-3[^"]*\bbg-muted\b/)
  })

  it("sits below the sticky site header at rest and covers it when open", () => {
    const header = read("components/site-header.tsx")
    const headerZ = zIndexOf(header, /<header[\s\S]*?className="[^"]*\bsticky\b[^"]*\bz-(\d+)\b/)
    const openZ = zIndexOf(search, /open \? "relative z-(\d+)" : "relative z-\d+"/)
    const restZ = zIndexOf(search, /open \? "relative z-\d+" : "relative z-(\d+)"/)
    assert.ok(restZ < headerZ, `search z-${restZ} must be below header z-${headerZ}`)
    assert.ok(restZ > 10, "search must still stack over the Board's own z-10 layers")
    assert.ok(openZ > headerZ, `open search view z-${openZ} must cover header z-${headerZ}`)
  })
})
