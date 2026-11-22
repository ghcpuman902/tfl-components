import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { correctHopMinutes } from "@/lib/tfl/geometry/hop-minutes-outliers"
import { pickHopPolyline } from "@/lib/tfl/vehicle-progress"
import { railPolylinesForLine } from "@/lib/tfl/rail-vehicle-geometry"
import { hopGraphForRailLine } from "@/lib/tfl/vehicle-hop-graph"
import { trainRoutes } from "@/lib/tfl/rail-train-tracker"
import type { RoutePolyline } from "@/lib/tfl/vehicle-progress"

/** A straight hop of `km` kilometres along the equator-ish line, so lengths are easy to reason about. */
const hop = (n: number, km: number, hopMinutes: number): RoutePolyline => ({
  lineId: "test",
  fromStationId: `S${n}`,
  toStationId: `S${n + 1}`,
  hopMinutes,
  line: {
    type: "LineString",
    coordinates: [
      [-0.2, 51.5],
      [-0.2 + (km * 1000) / (111_320 * Math.cos((51.5 * Math.PI) / 180)), 51.5],
    ],
  },
})

describe("hop minutes that cannot be right", () => {
  const ordinary = [1, 2, 3, 4, 5, 6].map((n) => hop(n, 1, 2))

  it("replaces a 17 minute hop over one kilometre with length ÷ line speed", () => {
    const { polylines, corrections } = correctHopMinutes([...ordinary, hop(7, 1, 17)])
    assert.equal(corrections.length, 1)
    assert.equal(corrections[0]!.was, 17)
    const fixed = polylines.find((row) => row.fromStationId === "S7")!
    assert.ok(fixed.hopMinutes! >= 1 && fixed.hopMinutes! <= 3, String(fixed.hopMinutes))
  })

  it("keeps a long hop that is long because the track is", () => {
    const { corrections } = correctHopMinutes([...ordinary, hop(7, 6, 6)])
    assert.deepEqual(corrections, [])
  })

  it("leaves a line alone when there is too little timing to judge", () => {
    const few = [hop(1, 1, 2), hop(2, 1, 17)]
    assert.deepEqual(correctHopMinutes(few).corrections, [])
  })
})

describe("Piccadilly King's Cross to Russell Square", () => {
  const canonical = hopGraphForRailLine("piccadilly").canonical

  it("is a couple of minutes, not seventeen", () => {
    const row = pickHopPolyline(railPolylinesForLine("piccadilly"), "940GZZLUKSX", "940GZZLURSQ", canonical)
    assert.ok(row?.hopMinutes != null && row.hopMinutes < 4, `hopMinutes ${row?.hopMinutes}`)
  })

  it("runs a train over it in well under the old 300 s clamp", () => {
    const route = trainRoutes("piccadilly").find((r) => {
      const i = r.stations.indexOf("940GZZLUKSX")
      return i >= 0 && r.stations[i + 1] === "940GZZLURSQ"
    })!
    const i = route.stations.indexOf("940GZZLUKSX")
    assert.ok(route.runSeconds[i]! < 200, `${route.runSeconds[i]} s`)
  })
})
