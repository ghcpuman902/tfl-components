import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { LineString } from "geojson"
import type { RealtimePrediction } from "tfl-ts"
import {
  ingestVehicleHops,
  vehicleTrackKey,
  type VehicleHopTrack,
} from "@/lib/tfl/vehicle-hop-engine"
import { hopGraphFromOrderedStops } from "@/lib/tfl/vehicle-hop-graph"

const EAST_LINE: LineString = {
  type: "LineString",
  coordinates: [
    [-0.16, 51.5],
    [-0.14, 51.5],
    [-0.13, 51.5],
    [-0.12, 51.5],
  ],
}

const STATIONS = new Map([
  ["A", { lat: 51.5, lon: -0.14 }],
  ["B", { lat: 51.5, lon: -0.13 }],
  ["C", { lat: 51.5, lon: -0.12 }],
])

const GRAPH = hopGraphFromOrderedStops(["A", "B", "C"])

const prediction = (fields: {
  vehicleId: string
  naptanId: string
  timeToStation: number
  lineId?: string
}): RealtimePrediction =>
  ({
    lineId: fields.lineId ?? "victoria",
    destinationName: "Brixton",
    ...fields,
  }) as RealtimePrediction

const ingest = (
  tracks: Map<string, VehicleHopTrack>,
  rows: RealtimePrediction[],
  asOf: number,
) =>
  ingestVehicleHops({
    tracks,
    predictions: rows,
    stationsById: STATIONS,
    polylines: [EAST_LINE],
    graph: GRAPH,
    asOf,
    staleDueMs: 50_000,
  })

describe("ingestVehicleHops", () => {
  it("seeds a new vehicle behind its next stop", () => {
    const tracks = new Map<string, VehicleHopTrack>()
    const [position] = ingest(
      tracks,
      [
        prediction({ vehicleId: "241", naptanId: "A", timeToStation: 30 }),
        prediction({ vehicleId: "241", naptanId: "B", timeToStation: 90 }),
      ],
      1_000,
    )
    assert.ok(position)
    assert.ok(position.lon < -0.14)
    assert.equal(position.nextStopId, "A")
    assert.ok((position.remainingKm ?? 0) > 0)
  })

  it("absorbs an ETA regression instead of walking backward", () => {
    const tracks = new Map<string, VehicleHopTrack>()
    const [first] = ingest(
      tracks,
      [prediction({ vehicleId: "241", naptanId: "A", timeToStation: 30 })],
      1_000,
    )
    assert.ok(first)
    const [second] = ingest(
      tracks,
      [prediction({ vehicleId: "241", naptanId: "A", timeToStation: 80 })],
      1_000 + 5_000,
    )
    assert.ok(second)
    assert.ok((second.remainingKm ?? 9) <= (first.remainingKm ?? 0))
    assert.ok(second.lon >= first.lon)
  })

  it("commits a hop when the next stop is graph-adjacent", () => {
    const tracks = new Map<string, VehicleHopTrack>()
    ingest(
      tracks,
      [prediction({ vehicleId: "241", naptanId: "A", timeToStation: 8 })],
      1_000,
    )
    const [next] = ingest(
      tracks,
      [prediction({ vehicleId: "241", naptanId: "B", timeToStation: 40 })],
      2_000,
    )
    assert.ok(next)
    assert.equal(next.nextStopId, "B")
    assert.equal(next.fromStopId, "A")
  })

  it("rejects a non-adjacent jump and keeps the locked hop", () => {
    const tracks = new Map<string, VehicleHopTrack>()
    ingest(
      tracks,
      [prediction({ vehicleId: "241", naptanId: "A", timeToStation: 20 })],
      1_000,
    )
    const [next] = ingest(
      tracks,
      [prediction({ vehicleId: "241", naptanId: "C", timeToStation: 10 })],
      2_000,
    )
    assert.ok(next)
    assert.equal(next.nextStopId, "A")
    const track = tracks.get(vehicleTrackKey("victoria", "241"))
    assert.equal(track?.toStationId, "A")
  })

  it("evicts a stale due vehicle", () => {
    const tracks = new Map<string, VehicleHopTrack>()
    ingest(
      tracks,
      [prediction({ vehicleId: "241", naptanId: "A", timeToStation: 0 })],
      1_000,
    )
    const later = ingest(
      tracks,
      [prediction({ vehicleId: "241", naptanId: "A", timeToStation: 0 })],
      1_000 + 51_000,
    )
    assert.equal(later.length, 0)
    assert.equal(tracks.size, 0)
  })

  it("keeps the same vehicleId on two lines as separate tracks", () => {
    const tracks = new Map<string, VehicleHopTrack>()
    const placed = ingest(
      tracks,
      [
        prediction({
          vehicleId: "240",
          naptanId: "A",
          timeToStation: 20,
          lineId: "victoria",
        }),
        prediction({
          vehicleId: "240",
          naptanId: "B",
          timeToStation: 20,
          lineId: "northern",
        }),
      ],
      1_000,
    )
    assert.equal(placed.length, 2)
    assert.equal(tracks.size, 2)
  })
})
