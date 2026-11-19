import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { STOP_INDEX, searchStops } from "tfl-ts/meta/stops"
import type { StopRow } from "@/lib/tfl/stop-index"
import { MAP_SEARCH_RADIUS_METERS, TRAFALGAR_SQUARE } from "@/lib/tfl/geo"
import {
  BROWSE_CAP,
  browseRows,
  fitFor,
  frameMatches,
  inFrame,
  leadWith,
  provisionalFrame,
  type Frame,
} from "@/lib/tfl/homepage-live/search-frame"

const kit = { index: STOP_INDEX, searchStops }
const KINGS_CROSS = { lat: 51.5308, lon: -0.1238 }

const row = (id: string, lat?: number, lon?: number): StopRow => ({
  id,
  name: id,
  kind: "bus",
  lat,
  lon,
  lines: [],
  modes: ["bus"],
})

describe("search frame", () => {
  it("opens on the Board place, or Trafalgar Square without one", () => {
    assert.deepEqual(provisionalFrame(KINGS_CROSS).center, KINGS_CROSS)
    assert.deepEqual(provisionalFrame().center, { lat: TRAFALGAR_SQUARE.lat, lon: TRAFALGAR_SQUARE.lon })
    assert.ok(inFrame(KINGS_CROSS, provisionalFrame(KINGS_CROSS)))
    assert.ok(!inFrame({ lat: 51.5, lon: -0.2 }, provisionalFrame(KINGS_CROSS)))
  })

  it("browses only what is in the frame, nearest the centre first", () => {
    const frame = provisionalFrame(KINGS_CROSS)
    const rows = browseRows(kit, frame)
    assert.ok(rows.some((r) => r.kind === "station" && /King.s Cross/.test(r.name)))
    assert.ok(rows.some((r) => r.kind === "bus"))
    assert.ok(rows.every((r) => inFrame(r, frame)))
    const distances = rows.map((r) => r.distance ?? -1)
    assert.deepEqual(distances, [...distances].sort((a, b) => a - b))
    const ids = new Set(rows.map((r) => r.id))
    assert.ok(rows.every((r) => r.kind === "bus" || !r.hubId || !ids.has(r.hubId)))
  })

  it("caps each kind when the frame is zoomed out", () => {
    const london: Frame = {
      center: { lat: 51.507, lon: -0.128 },
      bounds: { west: -0.35, south: 51.4, east: 0.1, north: 51.62 },
    }
    const rows = browseRows(kit, london)
    assert.equal(rows.filter((r) => r.kind === "station").length, BROWSE_CAP)
    assert.equal(rows.filter((r) => r.kind === "bus").length, BROWSE_CAP)
  })

  it("keeps typed matches in the frame in their ranked order", () => {
    const frame = provisionalFrame(KINGS_CROSS)
    const rows = [row("far", 51.42, -0.2), row("b", 51.531, -0.124), row("none"), row("a", 51.5305, -0.1235)]
    assert.deepEqual(frameMatches(rows, frame).map((r) => r.id), ["b", "a"])
  })

  it("leads with the picked row and keeps the rest in order", () => {
    const rows = [row("a"), row("b"), row("c")]
    assert.deepEqual(leadWith(rows, (r) => r.id === "c").map((r) => r.id), ["c", "a", "b"])
    assert.deepEqual(leadWith(rows, () => false).map((r) => r.id), ["a", "b", "c"])
  })

  it("fits around the top located rows, never tighter than the search radius", () => {
    assert.equal(fitFor([row("none")]), null)
    const close = fitFor([row("a", 51.5, -0.1), row("b", 51.5001, -0.1)])
    assert.equal(close?.radiusMeters, MAP_SEARCH_RADIUS_METERS)
    const wide = fitFor([row("a", 51.4, -0.1), row("none"), row("b", 51.42, -0.1)])
    assert.ok(Math.abs(wide!.origin.lat - 51.41) < 1e-9 && Math.abs(wide!.origin.lon + 0.1) < 1e-9)
    assert.ok(wide!.radiusMeters > 1_000 && wide!.radiusMeters < 1_200)
  })
})
