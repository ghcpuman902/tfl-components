import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  cleanArrivalRows,
  isAnonymousVehicle,
  trainKey,
} from "@/lib/tfl/homepage-live/clean-arrivals"
import { replayArrivalsRound } from "@/lib/tfl/homepage-live/fixture"
import {
  predictionArrivalTime,
  predictionSourceTime,
} from "@/lib/tfl/rail-train-tracker"
import {
  hopGraphForRailLine,
  stationHubCanonical,
} from "@/lib/tfl/vehicle-hop-graph"

const round = replayArrivalsRound(6)

describe("cleanArrivalRows on a recorded poll", () => {
  const cleaned = cleanArrivalRows(round.rows, round.receivedAt)

  it("ends each train's rows at its destination, dropping the next working", () => {
    const byTrain = new Map<string, typeof cleaned.rows>()
    for (const row of cleaned.rows) {
      if (isAnonymousVehicle(row.vehicleId)) continue
      byTrain.set(trainKey(row), [...(byTrain.get(trainKey(row)) ?? []), row])
    }
    let checked = 0
    for (const rows of byTrain.values()) {
      const line = rows[0]!.lineId!
      const canon = (id?: string) => stationHubCanonical(hopGraphForRailLine(line).canonical(id ?? ""))
      const ordered = [...rows].sort(
        (a, b) => predictionArrivalTime(a, 0) - predictionArrivalTime(b, 0)
      )
      const destination = canon(
        ordered.find((r) => r.destinationNaptanId)?.destinationNaptanId
      )
      const at = ordered.findIndex((r) => canon(r.naptanId) === destination)
      if (!destination || at < 0) continue
      checked++
      assert.equal(at, ordered.length - 1, `${trainKey(ordered[0]!)} continues past its destination`)
    }
    assert.ok(checked > 100)
    assert.ok(cleaned.stats.nextWorkingRows > 0, "the poll has next-working rows to cut")
  })

  it("keeps one row per stop for a train, even where a station has two ids", () => {
    const seen = new Set<string>()
    for (const row of cleaned.rows) {
      if (isAnonymousVehicle(row.vehicleId)) continue
      const line = row.lineId!
      const key = `${trainKey(row)}|${stationHubCanonical(hopGraphForRailLine(line).canonical(row.naptanId!))}`
      assert.ok(!seen.has(key), `duplicate stop ${key}`)
      seen.add(key)
    }
    assert.ok(cleaned.stats.dedupedStops > 0)
  })

  it("ages tram rows from their timestamp, not a cache stamp minutes old", () => {
    const tram = round.byLine.get("tram")!
    const stale = tram.filter(
      (r) => round.receivedAt - predictionSourceTime(r, round.receivedAt) > 180_000
    )
    assert.ok(stale.length > 0, "raw tram rows look older than the tracker's 180 s limit")
    const after = cleanArrivalRows(tram, round.receivedAt).rows
    const old = after.filter(
      (r) => round.receivedAt - predictionSourceTime(r, round.receivedAt) > 180_000
    )
    assert.equal(old.length, 0)
  })
})
