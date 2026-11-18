import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  countDownRows,
  elapsedSec,
  formatUpdatedAgo,
  isStale,
  liveStatusLine,
  STALE_AFTER_SEC,
} from "@/lib/tfl/homepage-live/data-age"

describe("data age", () => {
  it("is stale past 90 s and not before", () => {
    assert.equal(STALE_AFTER_SEC, 90)
    assert.equal(isStale(90), false)
    assert.equal(isStale(91), true)
    assert.equal(isStale(undefined), false)
  })

  it("says seconds under 90 and minutes after", () => {
    assert.equal(formatUpdatedAgo(40), "Updated 40 s ago.")
    assert.equal(formatUpdatedAgo(180), "Updated 3 min ago.")
  })

  it("counts elapsed time from the client clock and never goes negative", () => {
    assert.equal(elapsedSec(1_000, 31_000), 30)
    assert.equal(elapsedSec(31_000, 1_000), 0)
  })
})

describe("countdown between polls", () => {
  const rows = [
    { route: "73", etaSec: 120 },
    { route: "205", etaSec: 20 },
    { route: "46", etaSec: 5 },
  ]

  it("takes the elapsed seconds off each ETA", () => {
    assert.deepEqual(
      countDownRows(rows, 15).map((r) => r.etaSec),
      [105, 5, 0]
    )
  })

  it("drops a row once it is a minute past due, keeping the rest", () => {
    assert.deepEqual(
      countDownRows(rows, 100).map((r) => r.route),
      ["73"]
    )
  })
})

describe("the line under the search", () => {
  it("says live when the data is fresh", () => {
    assert.equal(liveStatusLine({ ageSec: 20 }), "Live from TfL, about a minute behind.")
  })

  it("keeps the last snapshot and gives its age when a refresh failed", () => {
    assert.equal(
      liveStatusLine({ error: "TfL is busy right now. The map will retry.", ageSec: 75 }),
      "TfL is busy right now. The map will retry. Updated 75 s ago."
    )
  })

  it("gives the age alone when the data has gone stale without an error", () => {
    assert.equal(liveStatusLine({ ageSec: 200 }), "Updated 3 min ago.")
  })

  it("says only the error when there is no snapshot yet", () => {
    assert.equal(liveStatusLine({ error: "Live trains are unavailable right now. The map will retry." }),
      "Live trains are unavailable right now. The map will retry.")
  })
})
