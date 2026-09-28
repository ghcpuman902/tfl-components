import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  BOARD_RATE_LIMIT_BODY,
  BOARD_RATE_LIMIT_INLINE,
  BOARD_RATE_LIMIT_RETRY,
  BOARD_RATE_LIMIT_TITLE,
  isTflRateLimitError,
} from "./board-rate-limit"
import { isBoardBikePointId, isBoardStopId } from "./board-live-ids"
import { HOME_BUS_STOP, HOME_RAIL_STOP, HOME_RIVER_STOP } from "./home-arrivals-stops"

const VISITOR_COPY = [
  BOARD_RATE_LIMIT_TITLE,
  BOARD_RATE_LIMIT_BODY,
  BOARD_RATE_LIMIT_RETRY,
  BOARD_RATE_LIMIT_INLINE,
]

describe("hosted board rate-limit copy", () => {
  it("stays a later-retry message", () => {
    assert.equal(BOARD_RATE_LIMIT_TITLE, "Too many boards right now")
    assert.match(BOARD_RATE_LIMIT_BODY, /later/)
    assert.equal(BOARD_RATE_LIMIT_RETRY, "Try again")
  })

  it("does not send visitors to a personal key or the API portal", () => {
    for (const line of VISITOR_COPY) {
      assert.doesNotMatch(line, /api key|app_key|portal|quota|register/i)
    }
  })
})

describe("isTflRateLimitError", () => {
  it("matches quota and HTTP 429 failures", () => {
    assert.equal(isTflRateLimitError(new Error("429 Too Many Requests")), true)
    assert.equal(isTflRateLimitError("Rate limit is exceeded. Try again in 12 seconds."), true)
    assert.equal(isTflRateLimitError({ httpStatusCode: 429, message: "Quota exceeded" }), true)
    assert.equal(
      isTflRateLimitError(new Error("Request failed", { cause: { status: 429 } })),
      true
    )
  })

  it("ignores key prompts, network drops, and ordinary misses", () => {
    assert.equal(
      isTflRateLimitError("This stop is not available on the site key. Add your own TfL API key."),
      false
    )
    assert.equal(isTflRateLimitError(new Error("Failed to fetch")), false)
    assert.equal(isTflRateLimitError(new Error("404 Not Found")), false)
  })
})

describe("board live id shape", () => {
  it("accepts the hosted rail, bus, and river stops", () => {
    assert.equal(isBoardStopId(HOME_RAIL_STOP.id), true)
    assert.equal(isBoardStopId(HOME_BUS_STOP.id), true)
    assert.equal(isBoardStopId(HOME_RIVER_STOP.id), true)
    assert.equal(isBoardStopId("910GLIVST"), true)
  })

  it("rejects paths, query strings, and empty ids", () => {
    assert.equal(isBoardStopId(""), false)
    assert.equal(isBoardStopId("../Line/victoria"), false)
    assert.equal(isBoardStopId("940GZZLUOXC?app_key=secret"), false)
    assert.equal(isBoardStopId("https://api.tfl.gov.uk"), false)
  })

  it("accepts cycle dock ids only in BikePoints form", () => {
    assert.equal(isBoardBikePointId("BikePoints_237"), true)
    assert.equal(isBoardBikePointId("237"), false)
    assert.equal(isBoardBikePointId("BikePoints_../1"), false)
  })
})
