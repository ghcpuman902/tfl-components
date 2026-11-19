import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { RealtimePrediction } from "tfl-ts"
import {
  COUNTDOWN_PRESETS,
  countdownLabel,
  createCountdownTracker,
} from "@/lib/tfl/countdown/countdown"

const T0 = Date.parse("2026-11-19T12:00:00Z")
const pred = (arrivalS: number, stampS: number): RealtimePrediction => ({
  vehicleId: "V1",
  naptanId: "S1",
  lineId: "25",
  timestamp: new Date(T0 + stampS * 1000).toISOString(),
  expectedArrival: new Date(T0 + arrivalS * 1000).toISOString(),
  timeToStation: arrivalS - stampS,
})

describe("countdown (vendored from tfl-ts)", () => {
  it("floors, says Due under a minute and goes null after the grace", () => {
    assert.equal(countdownLabel(T0 + 170_000, T0), "2 min")
    assert.equal(countdownLabel(T0 + 59_000, T0), "Due")
    assert.equal(countdownLabel(T0 - 9_000, T0), "Due")
    assert.equal(countdownLabel(T0 - 11_000, T0), null)
  })

  it("never ticks up across later revisions", () => {
    const tracker = createCountdownTracker({ projectionOffsetMs: 0 })
    tracker.ingest([pred(300, -20)], T0, T0)
    const polls: Record<number, RealtimePrediction> = {
      30: pred(320, 10),
      60: pred(390, 40),
      90: pred(390, 70),
    }
    let last = Infinity
    for (let s = 0; s <= 150; s += 5) {
      const poll = polls[s]
      if (poll) tracker.ingest([poll], T0 + s * 1000, T0 + s * 1000)
      const left = tracker.view(T0 + s * 1000)[0]!.secondsLeft
      assert.ok(left <= last)
      last = left
    }
  })

  it("starts a bus early by the preset", () => {
    const tracker = createCountdownTracker(COUNTDOWN_PRESETS.bus)
    tracker.ingest([pred(130, 0)], T0, T0)
    assert.equal(tracker.view(T0)[0]!.secondsLeft, 115)
  })
})

describe("countdown: a dropped vehicle", () => {
  it("does not return while the feed lists it as due", () => {
    const tracker = createCountdownTracker({ projectionOffsetMs: 0 })
    tracker.ingest([pred(60, 0)], T0, T0)
    assert.equal(tracker.view(T0 + 71_000).length, 0)
    tracker.ingest([pred(80, 80)], T0 + 80_000, T0 + 80_000)
    assert.equal(tracker.view(T0 + 81_000).length, 0)
    tracker.ingest([pred(260, 100)], T0 + 100_000, T0 + 100_000)
    assert.equal(tracker.view(T0 + 101_000).length, 1)
  })
})
