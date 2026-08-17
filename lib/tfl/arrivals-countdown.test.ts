import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { formatArrivalsCountdown } from "@/components/tfl/arrivals/arrivals-board-view"
import { RIVER_COUNTDOWN_CLOCK_FROM_SECONDS } from "@/lib/tfl/arrivals-defaults"

describe("formatArrivalsCountdown", () => {
  it("keeps Due and minutes below the river clock threshold", () => {
    assert.equal(formatArrivalsCountdown(45), "Due")
    assert.equal(
      formatArrivalsCountdown(29 * 60, {
        expectedArrival: "2026-08-17T19:02:00Z",
        clockFromSeconds: RIVER_COUNTDOWN_CLOCK_FROM_SECONDS,
      }),
      "29 min",
    )
  })

  it("uses London clock time from 30 minutes when expectedArrival is present", () => {
    assert.equal(
      formatArrivalsCountdown(30 * 60, {
        expectedArrival: "2026-08-17T19:02:00Z",
        clockFromSeconds: RIVER_COUNTDOWN_CLOCK_FROM_SECONDS,
      }),
      "20:02",
    )
  })

  it("falls back to minutes when expectedArrival is missing", () => {
    assert.equal(
      formatArrivalsCountdown(40 * 60, {
        clockFromSeconds: RIVER_COUNTDOWN_CLOCK_FROM_SECONDS,
      }),
      "40 min",
    )
  })

  it("does not switch to clock without clockFromSeconds", () => {
    assert.equal(
      formatArrivalsCountdown(40 * 60, {
        expectedArrival: "2026-08-17T19:02:00Z",
      }),
      "40 min",
    )
  })
})
