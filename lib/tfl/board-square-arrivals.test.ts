import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { OXFORD_CIRCUS_ARRIVALS } from "@/lib/tfl/fixtures/arrivals-boards"
import {
  BOARD_SQUARE_FAR_PAGE_SIZE,
  BOARD_SQUARE_PAGE_SIZE,
  buildSquareArrivalFrames,
  formatSquareArrivalMeta,
  prepareSquareArrivals,
  resolveSquareArrivalsPageSize,
} from "@/lib/tfl/board-square-arrivals"

describe("resolveSquareArrivalsPageSize", () => {
  it("uses 2 for far and 3 otherwise", () => {
    assert.equal(resolveSquareArrivalsPageSize(true), BOARD_SQUARE_FAR_PAGE_SIZE)
    assert.equal(resolveSquareArrivalsPageSize(false), BOARD_SQUARE_PAGE_SIZE)
  })

  it("honours a positive override", () => {
    assert.equal(resolveSquareArrivalsPageSize(true, 4), 4)
  })
})

describe("prepareSquareArrivals", () => {
  it("sorts Oxford Circus by soonest time across every line", () => {
    const rows = prepareSquareArrivals({ data: OXFORD_CIRCUS_ARRIVALS })
    assert.ok(rows.length >= 6)
    const times = rows.map((row) => row.arrival.timeToStation ?? 0)
    for (let i = 1; i < times.length; i++) {
      assert.ok(times[i]! >= times[i - 1]!)
    }
    // Victoria south Brixton @ 30s is sooner than Central west @ 45s.
    assert.equal(rows[0]?.arrival.towards, "Brixton")
    assert.equal(rows[0]?.arrival.lineId, "victoria")
  })

  it("drops expired predictions when now is set", () => {
    const rows = prepareSquareArrivals({
      data: OXFORD_CIRCUS_ARRIVALS,
      now: Date.now(),
    })
    assert.ok(rows.length > 0)
  })
})

describe("formatSquareArrivalMeta", () => {
  it("formats bound and platform", () => {
    assert.equal(
      formatSquareArrivalMeta("Westbound - Platform 1"),
      "Westbound · Platform 1"
    )
  })
})

describe("buildSquareArrivalFrames", () => {
  it("pins the first train and rotates the rest for far pageSize 2", () => {
    const rows = prepareSquareArrivals({ data: OXFORD_CIRCUS_ARRIVALS })
    const frames = buildSquareArrivalFrames(rows, 2, { pinFirst: true })
    assert.ok(frames.length >= 2)
    const firstKey = rows[0]!.key
    for (const frame of frames) {
      assert.equal(frame.rows[0]?.key, firstKey)
      assert.equal(frame.rows.length, 2)
    }
    assert.notEqual(frames[0]!.rows[1]?.key, frames[1]!.rows[1]?.key)
  })

  it("returns one frame when everything fits", () => {
    const rows = prepareSquareArrivals({
      data: OXFORD_CIRCUS_ARRIVALS.slice(0, 2),
    })
    const frames = buildSquareArrivalFrames(rows, 2, { pinFirst: true })
    assert.equal(frames.length, 1)
    assert.equal(frames[0]!.rows.length, 2)
  })
})
