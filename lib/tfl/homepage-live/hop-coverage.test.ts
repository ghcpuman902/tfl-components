import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, it } from "node:test"
import { hopCoverage } from "@/lib/tfl/homepage-live/hop-coverage"
import { ETA_ONLY_LINES, PLACED_LINES } from "@/lib/tfl/homepage-live/engine"
import {
  cutHop,
  lineLengthM,
  metresBetween,
  projectOnLine,
  type LngLat,
} from "@/lib/tfl/geometry/hop-track-patch"
import { railPolylinesForLine, railStationsById } from "@/lib/tfl/rail-vehicle-geometry"
import { hopGraphForRailLine } from "@/lib/tfl/vehicle-hop-graph"
import { pickHopPolyline, positionBehindStop } from "@/lib/tfl/vehicle-progress"

const LINES = [...PLACED_LINES, ...ETA_ONLY_LINES, "circle", "hammersmith-city", "metropolitan", "waterloo-city"]

describe("hop coverage of every active route", () => {
  it("can draw a train on every hop of every line", () => {
    for (const line of LINES) {
      const c = hopCoverage(line)
      assert.deepEqual(c.undrawable, [], `${line} has hops with no station coordinates`)
      assert.equal(c.onTrack + c.straight, c.hops)
    }
  })

  it("leaves at most two hops of the whole network as straight segments", () => {
    const straight = LINES.flatMap((line) => {
      const c = hopCoverage(line)
      return c.straight > 0 ? [`${line} ${c.straight}/${c.hops}`] : []
    })
    const total = LINES.reduce((sum, line) => sum + hopCoverage(line).straight, 0)
    assert.ok(total <= 2, straight.join(", "))
  })
})

describe("Northern line through King's Cross", () => {
  const polylines = railPolylinesForLine("northern")
  const canonical = hopGraphForRailLine("northern").canonical
  const coords = railStationsById()
  const hops: [string, string][] = [
    ["940GZZLUEUS", "940GZZLUKSX"],
    ["940GZZLUKSX", "940GZZLUAGL"],
  ]

  it("draws Euston to King's Cross and King's Cross to Angel on track, not as a straight line", () => {
    for (const [from, to] of hops) {
      const hop = pickHopPolyline(polylines, from, to, canonical)
      assert.ok(hop, `${from} to ${to} has no polyline`)
      const line = hop.line.coordinates as LngLat[]
      const a = coords.get(from)!
      const b = coords.get(to)!
      const chord = metresBetween([a.lon, a.lat], [b.lon, b.lat])
      assert.ok(line.length >= 8, `${line.length} points is a straight segment`)
      assert.ok(lineLengthM(line) < 1.15 * chord, "a stretch of track, not a detour")
      for (const end of [line[0]!, line[line.length - 1]!]) {
        const near = Math.min(metresBetween(end, [a.lon, a.lat]), metresBetween(end, [b.lon, b.lat]))
        assert.ok(near < 150, "starts and ends at its stations")
      }
    }
  })

  it("follows the OSM Northern track: every point is on a raw relation within 5 m", () => {
    const raw = JSON.parse(
      readFileSync(path.join(process.cwd(), "data/geography/tube-geometry.json"), "utf8")
    ) as { lines: { features: { properties: { lineId: string }; geometry: { type: string; coordinates: LngLat[] } }[] } }
    const relations = raw.lines.features
      .filter((f) => f.properties.lineId === "northern" && f.geometry.type === "LineString")
      .map((f) => f.geometry.coordinates)
    for (const [from, to] of hops) {
      const line = pickHopPolyline(polylines, from, to, canonical)!.line.coordinates as LngLat[]
      for (const point of line)
        assert.ok(
          relations.some((rel) => (projectOnLine(rel, point)?.offsetM ?? Infinity) < 5),
          "point is off every Northern relation"
        )
    }
  })
})

describe("cutting a hop from raw track", () => {
  const track: LngLat[] = [[-0.2, 51.5], [-0.19, 51.5], [-0.18, 51.51], [-0.17, 51.51]]
  it("keeps the stretch between two stations, whichever way they are given", () => {
    const forward = cutHop(track[0]!, track[3]!, [track])!
    const backward = cutHop(track[3]!, track[0]!, [track])!
    assert.deepEqual(forward.line, [...backward.line].reverse())
    assert.equal(forward.line.length, 4)
  })

  it("refuses a station far from the track and a stretch that is a detour", () => {
    assert.equal(cutHop([-0.2, 51.6], track[3]!, [track]), null)
    const loop: LngLat[] = [[-0.2, 51.5], [-0.2, 51.52], [-0.17, 51.52], [-0.17, 51.5005]]
    assert.equal(cutHop([-0.2, 51.5], [-0.17, 51.5005], [loop]), null)
  })
})

describe("a hop with no track polyline", () => {
  const from = { lat: 51.5, lon: -0.2 }
  const next = { lat: 51.5, lon: -0.19 }
  const args = {
    nextStop: next,
    fromStop: from,
    polylines: [],
    fromStopId: "A",
    toStopId: "B",
    straightFallback: true,
  }

  it("places the train on the segment between its two stations", () => {
    const half = positionBehindStop({ ...args, remainingKm: 0.35 })
    assert.ok(half.lon > from.lon && half.lon < next.lon)
    assert.equal(half.lat, 51.5)
  })

  it("lands on the next stop with nothing left to run, and never goes behind the last one", () => {
    const arrived = positionBehindStop({ ...args, remainingKm: 0 })
    assert.ok(Math.abs(arrived.lon - next.lon) < 1e-9)
    const early = positionBehindStop({ ...args, remainingKm: 50 })
    assert.ok(Math.abs(early.lon - from.lon) < 1e-9)
  })
})
