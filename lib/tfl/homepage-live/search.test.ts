import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, it } from "node:test"
import type { NearbyBusStop } from "@/lib/tfl/bus-stop-shape"
import { getExplorerTubeRailPoints } from "@/lib/tfl/explorer/points-tube-rail"
import {
  BUS_SEARCH_FAILED,
  BUS_SEARCH_TIMEOUT,
  initialSearchState,
  nextActiveIndex,
  rankBusHits,
  searchReducer,
  searchStations,
  toBusHit,
  type BusHit,
} from "@/lib/tfl/homepage-live/search"

type Recorded = {
  searches: Record<string, { id: string; name: string; towards?: string; lat?: number; lon?: number }[]>
  kxBusStops: NearbyBusStop[]
}
const recorded = JSON.parse(
  readFileSync(path.join(process.cwd(), "lib/tfl/fixtures/homepage-live/search.json"), "utf8")
) as Recorded
const points = getExplorerTubeRailPoints()
const KX = { lat: 51.5308, lon: -0.1238 }

const asBus = (m: Recorded["searches"][string][number]): BusHit => ({
  kind: "bus",
  id: m.id,
  name: m.name,
  towards: m.towards,
  routes: [],
  lat: m.lat,
  lon: m.lon,
})

describe("station search", () => {
  it("finds King's Cross St. Pancras for the ways people type it", () => {
    for (const q of ["kings cross", "king's cross", "kings", "KINGS CROSS"])
      assert.equal(searchStations(points, q)[0]?.id, "940GZZLUKSX", q)
  })

  it("puts Tower Hill and Tower Gateway first for 'tow', with their lines", () => {
    const hits = searchStations(points, "tow")
    assert.deepEqual(hits.slice(0, 2).map((h) => h.name).sort(), ["Tower Gateway", "Tower Hill"])
    assert.ok(hits.find((h) => h.name === "Tower Hill")!.lines.includes("district"))
  })

  it("returns nothing for gibberish", () => {
    assert.deepEqual(searchStations(points, "zzzzqq"), [])
  })
})

describe("bus stop ranking", () => {
  const king = recorded.searches["kings-cross"]!.map(asBus)

  it("drops stop-area clusters and keeps King's Cross Station D, E and R, nearest first", () => {
    const ranked = rankBusHits(king, "king's cross", KX)
    assert.ok(ranked.every((h) => !h.id.startsWith("490G")))
    const station = ranked.filter((h) => h.name === "King's Cross Station")
    assert.equal(station.length, 3)
    assert.equal(station[0]!.id, "490000129D")
  })

  it("does not trust TfL's order for 'tow'", () => {
    const ranked = rankBusHits(recorded.searches["tow"]!.map(asBus), "tow")
    const names = ranked.map((h) => h.name)
    assert.ok(names.slice(0, 3).some((n) => /^Tower/.test(n)), names.join(" | "))
  })

  it("orders same-name stops by letter when none is nearer", () => {
    const stops = recorded.kxBusStops.filter((s) => s.name === "King's Cross Station").map(toBusHit)
    const ranked = rankBusHits(stops, "king's cross")
    const letters = ranked.map((h) => h.stopLetter)
    assert.deepEqual(letters, [...letters].sort())
  })

  it("has the letter and routes of the stops around King's Cross", () => {
    const e = recorded.kxBusStops.find((s) => s.stopLetter === "E")!
    assert.ok(e.lines!.some((l) => ["205", "214", "30", "73"].includes(l)))
  })
})

describe("search state", () => {
  const typed = (q: string) => searchReducer(initialSearchState, { type: "typed", query: q })

  it("keeps old bus stops visible while a new attempt is pending", () => {
    let s = typed("king")
    s = searchReducer(s, { type: "result", attempt: s.attempt, hits: recorded.searches["kings-cross"]!.map(asBus) })
    const shown = s.hits.length
    assert.ok(shown > 0)
    s = searchReducer(s, { type: "typed", query: "kings" })
    assert.equal(s.status, "pending")
    assert.equal(s.hits.length, shown)
  })

  it("ignores a result that belongs to an older keystroke", () => {
    let s = typed("to")
    const old = s.attempt
    s = searchReducer(s, { type: "typed", query: "tow" })
    s = searchReducer(s, { type: "result", attempt: old, hits: recorded.searches["angel"]!.map(asBus) })
    assert.equal(s.status, "pending")
    assert.deepEqual(s.hits, [])
  })

  it("fails with one sentence and no stale stops, then recovers on the next keystroke", () => {
    let s = typed("tow")
    s = searchReducer(s, { type: "timeout", attempt: s.attempt })
    assert.equal(s.status, "failed")
    assert.equal(s.message, BUS_SEARCH_TIMEOUT)
    s = searchReducer(typed("tower"), { type: "failed", attempt: 1 })
    assert.equal(s.message, BUS_SEARCH_FAILED)
    s = searchReducer(s, { type: "typed", query: "tower h" })
    assert.equal(s.status, "pending")
    assert.equal(s.message, undefined)
  })

  it("does not search for one character", () => {
    assert.equal(typed("k").status, "idle")
  })

  it("a late timeout cannot undo a result", () => {
    let s = typed("angel")
    const attempt = s.attempt
    s = searchReducer(s, { type: "result", attempt, hits: recorded.searches["angel"]!.map(asBus) })
    s = searchReducer(s, { type: "timeout", attempt })
    assert.equal(s.status, "ok")
  })
})

describe("combobox keys", () => {
  it("wraps and jumps", () => {
    assert.equal(nextActiveIndex(-1, "ArrowDown", 3), 0)
    assert.equal(nextActiveIndex(2, "ArrowDown", 3), 0)
    assert.equal(nextActiveIndex(0, "ArrowUp", 3), 2)
    assert.equal(nextActiveIndex(1, "End", 3), 2)
    assert.equal(nextActiveIndex(1, "Home", 3), 0)
    assert.equal(nextActiveIndex(0, "ArrowDown", 0), -1)
  })
})
