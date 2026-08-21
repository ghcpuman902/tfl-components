import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  mapLegacyBrowseLinesRedirect,
  mapLegacyBusStopsRedirect,
  mapLegacyRouteStationsRedirect,
} from "./explorer-legacy-redirects"
import {
  EXPLORER_PATH,
  mergeExplorerChrome,
  parseExplorerPathname,
} from "./explorer-url-state"

const parseHref = (href: string) => {
  const url = new URL(href, "https://example.com")
  return mergeExplorerChrome(parseExplorerPathname(url.pathname), url.searchParams)
}

describe("mapLegacyBrowseLinesRedirect", () => {
  it("maps to lines / tube-rail", () => {
    const href = mapLegacyBrowseLinesRedirect()
    const parsed = parseHref(href)
    assert.equal(parsed.kind, "lines")
    assert.equal(parsed.domain, "tube-rail")
    assert.ok(!href.includes("tab="))
    assert.ok(href.startsWith(EXPLORER_PATH))
    assert.equal(href, `${EXPLORER_PATH}/lines`)
  })
})

describe("mapLegacyRouteStationsRedirect", () => {
  it("defaults missing lineId to central", () => {
    const href = mapLegacyRouteStationsRedirect()
    const parsed = parseHref(href)
    assert.equal(parsed.id, "central")
    assert.equal(parsed.dir, "inbound")
    assert.equal(href, `${EXPLORER_PATH}/lines/tube-rail/central`)
  })

  it("preserves lineId and outbound direction", () => {
    const href = mapLegacyRouteStationsRedirect("Victoria", "outbound")
    const parsed = parseHref(href)
    assert.equal(parsed.kind, "lines")
    assert.equal(parsed.domain, "tube-rail")
    assert.equal(parsed.id, "victoria")
    assert.equal(parsed.dir, "outbound")
    assert.equal(href, `${EXPLORER_PATH}/lines/tube-rail/victoria/outbound`)
  })

  it("falls back unknown direction to inbound", () => {
    const href = mapLegacyRouteStationsRedirect("northern", "both")
    const parsed = parseHref(href)
    assert.equal(parsed.dir, "inbound")
  })
})

describe("mapLegacyBusStopsRedirect", () => {
  it("maps to points / bus", () => {
    const href = mapLegacyBusStopsRedirect()
    const parsed = parseHref(href)
    assert.equal(parsed.kind, "points")
    assert.equal(parsed.domain, "bus")
    assert.ok(!href.includes("tab="))
    assert.equal(href, `${EXPLORER_PATH}/points/bus`)
  })
})
