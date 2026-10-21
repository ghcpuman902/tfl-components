import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  BOARD_GLANCE_PAGE_SIZE,
  BOARD_GLANCE_TALL_ASPECT,
  BOARD_GLANCE_TALL_PAGE_SIZE,
  buildGlanceArrivalFrames,
  resolveGlanceArrivalsPageSize,
} from "@/lib/tfl/board-glance-arrivals"
import type { ArrivalsPreparedRow } from "@/lib/tfl/arrivals-prepare"

describe("resolveGlanceArrivalsPageSize", () => {
  it("defaults to two rows on square / landscape", () => {
    assert.equal(resolveGlanceArrivalsPageSize(1), BOARD_GLANCE_PAGE_SIZE)
    assert.equal(resolveGlanceArrivalsPageSize(0.75), BOARD_GLANCE_PAGE_SIZE)
    assert.equal(resolveGlanceArrivalsPageSize(), BOARD_GLANCE_PAGE_SIZE)
  })

  it("uses three rows only on very tall portrait containers", () => {
    assert.equal(
      resolveGlanceArrivalsPageSize(BOARD_GLANCE_TALL_ASPECT),
      BOARD_GLANCE_TALL_PAGE_SIZE
    )
    assert.equal(resolveGlanceArrivalsPageSize(2.4), BOARD_GLANCE_TALL_PAGE_SIZE)
    assert.equal(resolveGlanceArrivalsPageSize(2.5), BOARD_GLANCE_TALL_PAGE_SIZE)
  })

  it("keeps two rows on phone and iPad portrait", () => {
    assert.equal(resolveGlanceArrivalsPageSize(1.33), BOARD_GLANCE_PAGE_SIZE)
    assert.equal(resolveGlanceArrivalsPageSize(2.16), BOARD_GLANCE_PAGE_SIZE)
  })

  it("honours a positive override over aspect", () => {
    assert.equal(resolveGlanceArrivalsPageSize(2, 4), 4)
  })

  it("ignores non-positive overrides so aspect still wins", () => {
    assert.equal(resolveGlanceArrivalsPageSize(2.5, 0), BOARD_GLANCE_TALL_PAGE_SIZE)
    assert.equal(resolveGlanceArrivalsPageSize(1, -1), BOARD_GLANCE_PAGE_SIZE)
  })
})

describe("buildGlanceArrivalFrames", () => {
  const row = (key: string): ArrivalsPreparedRow =>
    ({
      key,
      arrival: { timeToStation: 60 },
      sourceIndex: 0,
    }) as ArrivalsPreparedRow

  it("pins the first train across rotating frames", () => {
    const frames = buildGlanceArrivalFrames(
      [row("a"), row("b"), row("c"), row("d")],
      2,
      { pinFirst: true }
    )
    assert.equal(frames.length, 3)
    assert.deepEqual(
      frames.map((frame) => frame.rows.map((r) => r.key)),
      [
        ["a", "b"],
        ["a", "c"],
        ["a", "d"],
      ]
    )
  })
})
