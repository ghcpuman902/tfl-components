import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  MAX_USER_POLL_MS,
  computeBatchedPollIntervalMs,
} from "@/lib/tfl/vehicle-poll-rate"

describe("computeBatchedPollIntervalMs", () => {
  it("defaults max to the user-key floor", () => {
    assert.equal(computeBatchedPollIntervalMs(), MAX_USER_POLL_MS)
  })

  it("turns 6 requests/min into a 10s interval", () => {
    assert.equal(
      computeBatchedPollIntervalMs({ targetRequestsPerMinute: 6 }),
      10_000,
    )
  })

  it("does not go faster than the floor even at a huge target", () => {
    assert.equal(
      computeBatchedPollIntervalMs({ targetRequestsPerMinute: 500 }),
      MAX_USER_POLL_MS,
    )
  })
})
