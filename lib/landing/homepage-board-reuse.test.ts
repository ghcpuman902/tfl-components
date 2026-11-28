import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, it } from "node:test"

// Regression for Mangle's 18 Nov 2026 complaint: the homepage invented its own
// Board rows instead of the live Board, and the search was filled and painted
// over the site nav. 22 Nov 2026 (TFL-49, DROP SQUARE): rounded corners
// everywhere else, and the open search stays under the nav too. 23 Nov 2026
// (Mangle): the search field is the exception and stays square (the approved
// A5 hairline underline), and the station marks are registry LineColorBars.

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

  it("draws station lines with the registry LineColorBar, not hand-rolled pills", () => {
    assert.match(search, /<LineColorBar lineId=\{line\}/)
    assert.doesNotMatch(search, /rounded-full bg-\(--line-color\)/)
  })

  it("has a square hairline-underline field (no rounding), and so does the page fallback", () => {
    assert.match(fieldChromeOf(search), /\bborder-b border-foreground\b/)
    assert.doesNotMatch(fieldChromeOf(search), /\brounded/)
    assert.match(page, /"h-\[4\.5rem\] border-b border-foreground\b/)
    assert.doesNotMatch(page, /h-\[4\.5rem\][^"]*\brounded/)
  })

  it("squares MapLibre's zoom and credits controls in the search view only", () => {
    const css = read("app/globals.css")
    assert.match(search, /<div data-search-map className=/)
    const squareRules = [...css.matchAll(/([^{}]*maplibregl-ctrl[^{]*)\{[^}]*border-radius:\s*0/g)]
    const selectors = squareRules.flatMap((rule) =>
      rule[1]!.replace(/\/\*[\s\S]*?\*\//g, "").split(",").map((part) => part.trim()).filter(Boolean)
    )
    for (const control of [
      ".maplibregl-ctrl-group",
      ".maplibregl-ctrl-group button",
      ".maplibregl-ctrl-attrib",
      ".maplibregl-ctrl-attrib-button",
    ])
      assert.ok(selectors.includes(`[data-search-map] ${control}`), `search view squares ${control}`)
    // Everywhere else MapLibre keeps its rounding (DROP SQUARE).
    for (const selector of selectors)
      assert.match(selector, /^\[data-search-map\] /, `unscoped square override: ${selector}`)
  })

  it("puts a stop letter right after the name (A5), not at the row's far edge", () => {
    // The name slot is as wide as the name (flex-initial), never flex-1, and the
    // name fits against the room beside the letter, not its own shrink-wrapped box.
    const listName = search.slice(search.indexOf("const ListName"), search.indexOf("const rowLabel"))
    assert.match(listName, /<span\s+ref=\{ref\}\s+className="min-w-0 flex-initial"/)
    assert.doesNotMatch(listName, /\bflex-1\b/)
    assert.match(listName, /maxWidth=\{room\}/)
    // The badge is the name's next sibling in the same row.
    assert.match(
      search,
      /<ListName name=\{row\.name\} \/>\s*\{row\.kind === "bus" && row\.letter \? \(\s*<StopLetterBadge letter=\{row\.letter\} size="sm" \/>/
    )
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
