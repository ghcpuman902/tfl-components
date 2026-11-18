import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, it } from "node:test"
import type { NearbyBusStop } from "@/lib/tfl/bus-stop-shape"
import { getExplorerTubeRailPoints } from "@/lib/tfl/explorer/points-tube-rail"
import { buildHubStationIds } from "@/lib/tfl/homepage-live/hub-stations"
import {
  nextActiveIndex,
  placeHitOfRow,
  rankBusHits,
  toBusHit,
  type BusHit,
} from "@/lib/tfl/homepage-live/search"
import { loadStopSearch } from "@/lib/tfl/stop-index"

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

describe("index rows as selections", () => {
  it("resolves the King's Cross hub row to the stops that carry its arrivals", async () => {
    const kit = await loadStopSearch()
    const row = kit.searchStops(kit.index, "kings cross")[0]!
    const hit = placeHitOfRow(row, points, buildHubStationIds(points))
    assert.equal(hit.kind, "station")
    assert.ok(hit.kind === "station" && hit.stopIds.includes("940GZZLUKSX"))
  })

  it("keeps the painted letter and routes of a bus stop row", async () => {
    const kit = await loadStopSearch()
    const row = kit.index.byId("490000129E")!
    const hit = placeHitOfRow(row, points)
    assert.ok(hit.kind === "bus" && hit.stopLetter === "E" && hit.routes.includes("73"))
  })
})
