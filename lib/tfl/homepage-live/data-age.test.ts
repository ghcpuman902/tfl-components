import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  countDownRows,
  elapsedSec,
  isStale,
  STALE_AFTER_SEC,
} from "@/lib/tfl/homepage-live/data-age"

describe("data age", () => {
  it("is stale past 90 s and not before", () => {
    assert.equal(STALE_AFTER_SEC, 90)
    assert.equal(isStale(90), false)
    assert.equal(isStale(91), true)
    assert.equal(isStale(undefined), false)
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
