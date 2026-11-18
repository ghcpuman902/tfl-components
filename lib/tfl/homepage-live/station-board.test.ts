import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { compactRound } from "@/lib/tfl/homepage-live/compact"
import { replayArrivalsRound } from "@/lib/tfl/homepage-live/fixture"
import { computeFrame } from "@/lib/tfl/homepage-live/replay-frame"
import { replayRoundsFor } from "@/lib/tfl/homepage-live/replay-params"
import {
  busesDueWithin,
  trainsAroundStation,
} from "@/lib/tfl/homepage-live/station-board"

describe("buses due at a stop", () => {
  it("counts distinct buses inside the window, not trains", () => {
    const rows = [
      { route: "73", vehicleId: "A", etaSec: 60 },
      { route: "73", vehicleId: "A", etaSec: 65 },
      { route: "30", vehicleId: "B", etaSec: 599 },
      { route: "205", vehicleId: "C", etaSec: 601 },
      { route: "214", etaSec: 120 },
    ]
    assert.equal(busesDueWithin(rows), 3)
    assert.equal(busesDueWithin([]), 0)
  })
})

describe("trains around King's Cross at 300 s of the recording", () => {
  it("draws the trains within ten minutes, none of them hidden", () => {
    const frame = computeFrame(
      replayRoundsFor({ fixture: "kx", round: 10 }).map((i) => {
        const recorded = replayArrivalsRound(i)
        return compactRound(recorded.rows, recorded.receivedAt)
      })
    )
    const around = trainsAroundStation({
      rows: frame.rows,
      trains: frame.snapshot.trains,
      stopIds: ["940GZZLUKSX"],
      receivedAt: frame.receivedAt,
    })
    assert.ok(around.length >= 10 && around.length <= 70, `${around.length} trains around KX`)
    assert.ok(around.every((t) => t.status !== "hidden" && t.position))
  })
})
