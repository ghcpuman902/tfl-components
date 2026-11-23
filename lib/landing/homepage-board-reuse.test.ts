import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, it } from "node:test"

// Regression for Mangle's 18 Nov 2026 complaint: the homepage invented its own
// Board rows instead of the live Board, and the search was filled and painted
// over the site nav. 22 Nov 2026 (TFL-49, DROP SQUARE): rounded corners are
// required again, and the open search stays under the nav too.

const root = join(dirname(fileURLToPath(import.meta.url)), "../..")
const read = (relative: string) => readFileSync(join(root, relative), "utf8")

/** The resting field's chrome: the div holding the search icon and the input. */
const fieldChromeOf = (source: string): string => {
  const match = source.match(/ref=\{fieldRef\}\s*className="([^"]+)"/)
  assert.ok(match, "no field chrome (ref={fieldRef}) in place-search")
  return match[1]!
}

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
  const page = read("app/page.tsx")

  it("has rounded field chrome (DROP SQUARE), and so does the page fallback", () => {
    assert.match(fieldChromeOf(search), /\brounded-(md|lg|xl)\b/)
    assert.match(page, /\brounded-(md|lg|xl)\b[^"]*\bborder\b|\bborder\b[^"]*\brounded-(md|lg|xl)\b/)
  })

  it("leaves MapLibre's controls their own rounding (no square override)", () => {
    assert.doesNotMatch(read("app/globals.css"), /maplibregl-ctrl[^{]*\{[^}]*border-radius:\s*0/)
  })

  it("has no fill in its default state", () => {
    assert.doesNotMatch(fieldChromeOf(search), /\bbg-(muted|card|secondary|accent)\b/)
    assert.doesNotMatch(search, /rounded-\[14px\] bg-muted|"flex items-center gap-3[^"]*\bbg-muted\b/)
  })

  it("stays below the sticky site header at rest and when open", () => {
    const header = read("components/site-header.tsx")
    const headerZ = zIndexOf(header, /<header[\s\S]*?className="[^"]*\bsticky\b[^"]*\bz-(\d+)\b/)
    const searchZ = zIndexOf(search, /<div className="relative z-(\d+)">/)
    assert.ok(searchZ < headerZ, `search z-${searchZ} must be below header z-${headerZ}`)
    assert.ok(searchZ > 10, "search must still stack over the Board's own z-10 layers")
    // No layer of the search may climb above the header or reach the top of the screen.
    for (const [, z] of search.matchAll(/\bz-(\d+)\b/g))
      assert.ok(Number(z) < headerZ, `search layer z-${z} must be below header z-${headerZ}`)
    assert.doesNotMatch(search, /\bfixed inset-x-0 top-0\b|\bh-dvh\b/)
  })

  it("opens in place, covering only the main area under the header", () => {
    assert.match(search, /"fixed inset-x-0 top-\(--site-header-height\) bottom-0\b/)
    // Still the real input, not a button that opens another view.
    assert.match(search, /<input[\s\S]*?role="combobox"/)
  })

  it("docks the live Board on the right on desktop while open; the phone stays one column", () => {
    assert.match(search, /<aside[\s\S]*?className="hidden [^"]*\blg:block\b/)
    const product = read("components/home/home-product.tsx")
    assert.match(product, /aside=\{[\s\S]*?\{board\}/)
  })
})
