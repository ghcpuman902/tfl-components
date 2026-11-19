import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { createMemoryStore } from "@/lib/tfl/homepage-live/bus-quota"
import {
  boardOutcome,
  busEtaSecAt,
  refreshBusStop,
} from "@/lib/tfl/homepage-live/bus-stop-arrivals"

const T = Date.parse("2026-11-19T07:09:44Z")
const TTS = 290
const tflRow = {
  timestamp: new Date(T).toISOString(),
  timeToStation: TTS,
  expectedArrival: new Date(T + TTS * 1000).toISOString(),
}

describe("bus countdown", () => {
  for (const lagSec of [0, 45, 115]) {
    it(`reaches 0 at TfL timestamp + timeToStation when we read ${lagSec} s after TfL`, async () => {
      const readAt = T + lagSec * 1000
      let clock = readAt
      const snapshot = await refreshBusStop("490000129E", {
        store: createMemoryStore(),
        fetchRows: async (_id, at) => [
          { route: "25", destination: "Ilford", etaSec: busEtaSecAt(tflRow, at) },
        ],
        now: () => clock,
      })
      clock = T + TTS * 1000
      assert.equal(boardOutcome(snapshot, clock).rows[0]!.etaSec, 0)
      clock = T + (TTS - 60) * 1000
      assert.equal(boardOutcome(snapshot, clock).rows[0]!.etaSec, 60)
    })
  }

  it("uses timestamp + timeToStation when expectedArrival is missing", () => {
    const row = { timestamp: tflRow.timestamp, timeToStation: TTS }
    assert.equal(busEtaSecAt(row, T + 50_000), TTS - 50)
  })
})
