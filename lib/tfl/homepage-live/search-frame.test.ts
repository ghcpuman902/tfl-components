import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { STOP_INDEX, searchStops } from "tfl-ts/meta/stops"
import type { StopRow } from "@/lib/tfl/stop-index"
import { MAP_SEARCH_RADIUS_METERS, TRAFALGAR_SQUARE } from "@/lib/tfl/geo"
import {
  BROWSE_CAP,
  browseRows,
  busStopDots,
  fitFor,
  frameWins,
  matchStrength,
  strongestRows,
  frameMatches,
  searchInFrame,
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

  it("lists every bus stop in a zoomed-out frame as a dot, uncapped", () => {
    const london: Frame = {
      center: { lat: 51.507, lon: -0.128 },
      bounds: { west: -0.35, south: 51.4, east: 0.1, north: 51.62 },
    }
    const dots = busStopDots(kit, london)
    assert.ok(dots.length > BROWSE_CAP * 10)
    assert.ok(dots.every(([lon, lat]) => inFrame({ lat, lon }, london)))
    assert.equal(busStopDots(kit, provisionalFrame(KINGS_CROSS)).length > 0, true)
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

  it("searches the whole index inside the frame, not just London's top matches", () => {
    const frame = provisionalFrame(KINGS_CROSS)
    const londonTop = searchStops(STOP_INDEX, "Road", { near: KINGS_CROSS, limit: 40 })
    const live = row("live-only", 51.5307, -0.1237)
    const found = searchInFrame(kit, "Road", frame, [...londonTop, live])
    assert.ok(found.every((r) => inFrame(r, frame)))
    assert.ok(found.length > frameMatches(londonTop, frame).length)
    assert.equal(found.filter((r) => r.id === "live-only").length, 1)
    assert.deepEqual(searchInFrame(kit, " ", frame, []), [])
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
    const wide = fitFor([row("a", 51.4, -0.1), row("none"), row("b", 51.408, -0.1), row("far", 51.6, -0.1)])
    assert.ok(Math.abs(wide!.origin.lat - 51.404) < 1e-9 && Math.abs(wide!.origin.lon + 0.1) < 1e-9)
    assert.ok(wide!.radiusMeters > 400 && wide!.radiusMeters < 500, "a far namesake is left out of the fit")
  })

  describe("ranking: match quality first, then in view", () => {
    const frame = provisionalFrame(KINGS_CROSS)
    const named = (name: string, inside: boolean): StopRow => ({
      ...row(`${name}-${inside}`, inside ? 51.5308 : 51.51, inside ? -0.1238 : -0.09),
      name,
    })
    it("grades exact, prefix and contains", () => {
      assert.equal(matchStrength("Bank Underground Station", "bank"), 0)
      assert.equal(matchStrength("Bank Road", "Bank"), 1)
      assert.equal(matchStrength("Park Bank Road", "Bank"), 2)
    })
    it("exact in view beats exact outside", () => {
      const a = named("Bank", true)
      assert.ok(frameWins("Bank", [a], [named("Bank", false), a], frame))
    })
    it("a prefix outside beats a contains in view, and the fit uses the strong rows", () => {
      const weak = named("Old Bank Lane", true)
      const strong = named("Bank Road", false)
      assert.ok(!frameWins("Bank", [weak], [weak, strong], frame))
      assert.deepEqual(strongestRows([weak, strong], "Bank").map((r) => r.id), [strong.id])
    })
    it("contains in view beats contains outside", () => {
      const a = named("Old Bank Lane", true)
      assert.ok(frameWins("Bank", [a], [a, named("Far Bank Lane", false)], frame))
    })
    it("nothing in view never wins", () => {
      assert.ok(!frameWins("Bank", [], [named("Bank", false)], frame))
    })
  })
})
