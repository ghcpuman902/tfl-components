import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  DEFAULT_EXPLORER_STATE,
  EXPLORER_PATH,
  buildExplorerHref,
  domainsForKind,
  legacyExplorerRedirectHref,
  mergeExplorerChrome,
  parseExplorerPath,
  parseExplorerPathname,
  parseExplorerState,
} from "./explorer-url-state"

describe("parseExplorerState", () => {
  it("returns defaults for empty params", () => {
    assert.deepEqual(parseExplorerState({}), {
      ...DEFAULT_EXPLORER_STATE,
      id: undefined,
      q: undefined,
    })
  })

  it("falls back on invalid kind", () => {
    const state = parseExplorerState({ kind: "vehicles" })
    assert.equal(state.kind, "points")
  })

  it("falls back on invalid domain for points", () => {
    const state = parseExplorerState({ kind: "points", domain: "boats" })
    assert.equal(state.domain, "tube-rail")
  })

  it("accepts river for points and lines", () => {
    assert.equal(
      parseExplorerState({ kind: "points", domain: "river" }).domain,
      "river"
    )
    assert.equal(
      parseExplorerState({ kind: "lines", domain: "river" }).domain,
      "river"
    )
  })

  it("rejects cycle under lines", () => {
    const state = parseExplorerState({ kind: "lines", domain: "cycle" })
    assert.equal(state.kind, "lines")
    assert.equal(state.domain, "tube-rail")
  })

  it("accepts valid combinations", () => {
    const state = parseExplorerState({
      kind: "lines",
      domain: "bus",
      tab: "find",
      view: "map",
      id: "central",
      dir: "outbound",
      q: "baker",
    })
    assert.deepEqual(state, {
      kind: "lines",
      domain: "bus",
      view: "map",
      id: "central",
      dir: "outbound",
      q: "baker",
    })
  })

  it("ignores legacy tab and falls back on invalid view/dir", () => {
    const state = parseExplorerState({
      tab: "map",
      view: "browse",
      dir: "both",
    })
    assert.equal(state.view, "list")
    assert.equal(state.dir, "inbound")
  })

  it("lowercases line ids from the query string", () => {
    const state = parseExplorerState({
      kind: "lines",
      domain: "bus",
      id: "N279",
    })
    assert.equal(state.id, "n279")
  })

  it("keeps point id case", () => {
    const state = parseExplorerState({
      kind: "points",
      domain: "bus",
      id: "490010245E",
    })
    assert.equal(state.id, "490010245E")
  })

  it("reads first value from array params", () => {
    const state = parseExplorerState({
      kind: ["lines", "points"],
      id: ["victoria"],
    })
    assert.equal(state.kind, "lines")
    assert.equal(state.id, "victoria")
  })

  it("accepts URLSearchParams and ignores tab", () => {
    const params = new URLSearchParams("kind=points&domain=bus&tab=find")
    const state = parseExplorerState(params)
    assert.equal(state.kind, "points")
    assert.equal(state.domain, "bus")
    assert.equal("tab" in state, false)
  })
})

describe("parseExplorerPath", () => {
  it("returns defaults for empty segments", () => {
    assert.deepEqual(parseExplorerPath([]), {
      ...DEFAULT_EXPLORER_STATE,
      id: undefined,
      q: undefined,
    })
  })

  it("treats /lines as lines / tube-rail", () => {
    const state = parseExplorerPath(["lines"])
    assert.equal(state.kind, "lines")
    assert.equal(state.domain, "tube-rail")
    assert.equal(state.id, undefined)
  })

  it("parses kind / domain / id / outbound", () => {
    const state = parseExplorerPath([
      "lines",
      "tube-rail",
      "victoria",
      "outbound",
    ])
    assert.deepEqual(state, {
      kind: "lines",
      domain: "tube-rail",
      view: "list",
      id: "victoria",
      dir: "outbound",
      q: undefined,
    })
  })

  it("lowercases line ids and keeps point id case", () => {
    assert.equal(parseExplorerPath(["lines", "bus", "N97"]).id, "n97")
    assert.equal(
      parseExplorerPath(["points", "bus", "490010245E"]).id,
      "490010245E"
    )
  })

  it("decodes encoded point ids", () => {
    const state = parseExplorerPath(["points", "cycle", "BikePoints%5F1"])
    assert.equal(state.id, "BikePoints_1")
  })
})

describe("parseExplorerPathname", () => {
  it("parses the explorer root and nested paths", () => {
    assert.equal(parseExplorerPathname(EXPLORER_PATH).kind, "points")
    assert.equal(parseExplorerPathname(`${EXPLORER_PATH}/`).kind, "points")
    assert.equal(parseExplorerPathname(`${EXPLORER_PATH}/lines`).kind, "lines")
    assert.equal(parseExplorerPathname(`${EXPLORER_PATH}/points`).kind, "points")
    assert.equal(
      parseExplorerPathname(`${EXPLORER_PATH}/points/tube-rail/940GZZLUOXC`).id,
      "940GZZLUOXC"
    )
    assert.equal(
      parseExplorerPathname(`${EXPLORER_PATH}/lines/bus/n97`).id,
      "n97"
    )
  })
})

describe("buildExplorerHref", () => {
  it("always includes kind, even for default points / tube-rail", () => {
    assert.equal(buildExplorerHref({}), `${EXPLORER_PATH}/points`)
    assert.equal(
      buildExplorerHref({ kind: "points", domain: "tube-rail" }),
      `${EXPLORER_PATH}/points`
    )
    assert.equal(
      buildExplorerHref({ kind: "lines", domain: "tube-rail" }),
      `${EXPLORER_PATH}/lines`
    )
  })

  it("round-trips a point id path", () => {
    const href = buildExplorerHref({
      kind: "points",
      domain: "bus",
      id: "490010245E",
    })
    assert.equal(href, `${EXPLORER_PATH}/points/bus/490010245E`)
    const parsed = parseExplorerPathname(href)
    assert.equal(parsed.kind, "points")
    assert.equal(parsed.domain, "bus")
    assert.equal(parsed.id, "490010245E")
  })

  it("lowercases line ids so night-bus links match the directory", () => {
    const href = buildExplorerHref({
      kind: "lines",
      domain: "bus",
      id: "N97",
    })
    assert.equal(href, `${EXPLORER_PATH}/lines/bus/n97`)
  })

  it("preserves point id case", () => {
    const href = buildExplorerHref({
      kind: "points",
      domain: "bus",
      id: "490010245E",
    })
    assert.equal(href, `${EXPLORER_PATH}/points/bus/490010245E`)
  })

  it("appends outbound as a path segment and keeps view/q as query", () => {
    const href = buildExplorerHref({
      kind: "lines",
      domain: "tube-rail",
      id: "central",
      dir: "outbound",
      view: "map",
      q: "baker",
    })
    assert.equal(
      href,
      `${EXPLORER_PATH}/lines/tube-rail/central/outbound?view=map&q=baker`
    )
  })

  it("clamps cycle when switching to lines", () => {
    const href = buildExplorerHref(
      { kind: "lines" },
      {
        ...DEFAULT_EXPLORER_STATE,
        kind: "points",
        domain: "cycle",
      }
    )
    assert.equal(href, `${EXPLORER_PATH}/lines`)
    assert.ok(!href.includes("cycle"))
  })

  it("round-trips with parseExplorerPathname and chrome query", () => {
    const original = {
      kind: "lines" as const,
      domain: "tube-rail" as const,
      view: "list" as const,
      id: "central",
      dir: "outbound" as const,
      q: undefined,
    }
    const href = buildExplorerHref(original)
    const url = new URL(href, "https://example.com")
    const parsed = mergeExplorerChrome(
      parseExplorerPathname(url.pathname),
      url.searchParams
    )
    assert.deepEqual(parsed, { ...original, q: undefined })
  })
})

describe("legacyExplorerRedirectHref", () => {
  it("returns null when hierarchy is already in the path", () => {
    assert.equal(
      legacyExplorerRedirectHref(new URLSearchParams("view=map")),
      null
    )
  })

  it("maps legacy query hierarchy onto a path and keeps chrome", () => {
    const href = legacyExplorerRedirectHref(
      new URLSearchParams("kind=lines&domain=bus&id=N97&view=map")
    )
    assert.equal(href, `${EXPLORER_PATH}/lines/bus/n97?view=map`)
  })
})

describe("domainsForKind", () => {
  it("excludes cycle from lines and includes river on both", () => {
    assert.deepEqual(domainsForKind("lines"), ["tube-rail", "bus", "river"])
    assert.deepEqual(domainsForKind("points"), [
      "tube-rail",
      "bus",
      "river",
      "cycle",
    ])
  })
})
