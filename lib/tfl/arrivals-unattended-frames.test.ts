import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  buildPinnedFrames,
  chunkWithFinalBackfill,
  refreshFrameRows,
} from "@/lib/tfl/arrivals-unattended-frames"
import type { ArrivalsPreparedRow } from "@/lib/tfl/arrivals-prepare"
import type { RealtimePrediction } from "tfl-ts"

const row = (key: string, index: number, seconds = 60): ArrivalsPreparedRow => ({
  key,
  sourceIndex: index,
  arrival: { id: key, timeToStation: seconds } as RealtimePrediction,
})

const keys = (frames: ReturnType<typeof buildPinnedFrames>["frames"]) =>
  frames.map((frame) => frame.rows.map((item) => item.key))

describe("chunkWithFinalBackfill", () => {
  it("backfills only the final short window", () => {
    assert.deepEqual(chunkWithFinalBackfill([1, 2, 3], 2), [[1, 2], [2, 3]])
    assert.deepEqual(chunkWithFinalBackfill([1, 2, 3, 4], 2), [
      [1, 2],
      [3, 4],
    ])
  })

  it("returns a single window when everything fits", () => {
    assert.deepEqual(chunkWithFinalBackfill([1, 2], 3), [[1, 2]])
  })

  it("returns no windows for an empty list", () => {
    assert.deepEqual(chunkWithFinalBackfill([], 2), [])
  })
})

describe("buildPinnedFrames", () => {
  it("pins the first arrival and chunks later slots with final-window backfill", () => {
    const cases: [number, string[][]][] = [
      [4, [["r1", "r2", "r3"], ["r1", "r3", "r4"]]],
      [5, [["r1", "r2", "r3"], ["r1", "r4", "r5"]]],
      [6, [["r1", "r2", "r3"], ["r1", "r4", "r5"], ["r1", "r5", "r6"]]],
      [7, [["r1", "r2", "r3"], ["r1", "r4", "r5"], ["r1", "r6", "r7"]]],
    ]
    for (const [count, expected] of cases) {
      const rows = Array.from({ length: count }, (_, index) =>
        row(`r${index + 1}`, index)
      )
      const { frames, pageCount } = buildPinnedFrames(rows, 3)
      assert.equal(pageCount, expected.length, `${count} arrivals`)
      assert.deepEqual(keys(frames), expected, `${count} arrivals`)
    }
  })

  it("keeps ranks aligned with the full ordered list", () => {
    const rows = Array.from({ length: 5 }, (_, index) =>
      row(`r${index + 1}`, index)
    )
    const { frames } = buildPinnedFrames(rows, 3)
    assert.deepEqual(frames[0]?.ranks, [1, 2, 3])
    assert.deepEqual(frames[1]?.ranks, [1, 4, 5])
  })

  it("does not backfill when later slots are an exact multiple", () => {
    const rows = Array.from({ length: 5 }, (_, index) =>
      row(`r${index + 1}`, index)
    )
    const { frames } = buildPinnedFrames(rows, 3)
    assert.deepEqual(keys(frames), [
      ["r1", "r2", "r3"],
      ["r1", "r4", "r5"],
    ])
  })

  it("uses one-row windows when pageSize is 2", () => {
    const rows = Array.from({ length: 4 }, (_, index) =>
      row(`r${index + 1}`, index)
    )
    const { frames } = buildPinnedFrames(rows, 2)
    assert.deepEqual(keys(frames), [
      ["r1", "r2"],
      ["r1", "r3"],
      ["r1", "r4"],
    ])
  })

  it("rotates equally when pinFirst is off", () => {
    const rows = Array.from({ length: 6 }, (_, index) =>
      row(`r${index + 1}`, index)
    )
    const { frames } = buildPinnedFrames(rows, 3, { pinFirst: false })
    assert.deepEqual(keys(frames), [
      ["r1", "r2", "r3"],
      ["r4", "r5", "r6"],
    ])
    assert.deepEqual(frames[1]?.ranks, [4, 5, 6])
  })

  it("stays on one frame when every row already fits", () => {
    const rows = [row("a", 0), row("b", 1)]
    const { frames, pageCount } = buildPinnedFrames(rows, 4)
    assert.equal(pageCount, 1)
    assert.deepEqual(frames[0]?.rows.map((item) => item.key), ["a", "b"])
    assert.equal(frames[0]?.showEndMessage, true)
  })

  it("keeps the rotating window id when the pinned row is replaced", () => {
    const first = buildPinnedFrames(
      [row("old", 0), row("b", 1), row("c", 2), row("d", 3), row("e", 4)],
      3
    )
    const next = buildPinnedFrames(
      [row("new", 0), row("b", 1), row("c", 2), row("d", 3), row("e", 4)],
      3
    )
    assert.equal(first.frames[0]?.id, next.frames[0]?.id)
    assert.equal(next.frames[0]?.rows[0]?.key, "new")
    assert.deepEqual(next.frames[0]?.ranks, [1, 2, 3])
  })

  it("covers a flat bus list and a route-sized group the same way", () => {
    const rows = Array.from({ length: 5 }, (_, index) =>
      row(`bus-${index + 1}`, index)
    )
    const flat = buildPinnedFrames(rows, 3)
    const grouped = buildPinnedFrames(rows, 3)
    assert.deepEqual(keys(flat.frames), keys(grouped.frames))
    assert.deepEqual(flat.frames[1]?.ranks, [1, 4, 5])
  })
})

describe("refreshFrameRows", () => {
  it("updates countdown in place without changing order or ranks", () => {
    const committed = [row("a", 0, 90), row("b", 1, 120), row("c", 2, 180)]
    const { frames } = buildPinnedFrames(committed, 3)
    const frame = frames[0]
    assert.ok(frame)
    const live = [row("c", 2, 60), row("a", 0, 30), row("b", 1, 80)]
    const refreshed = refreshFrameRows(frame, live)
    assert.deepEqual(
      refreshed.rows.map((item) => item.key),
      ["a", "b", "c"]
    )
    assert.deepEqual(
      refreshed.rows.map((item) => item.arrival.timeToStation),
      [30, 80, 60]
    )
    assert.deepEqual(refreshed.ranks, frame.ranks)
    assert.equal(refreshed.dashCount, frame.dashCount)
    assert.equal(refreshed.showEndMessage, frame.showEndMessage)
  })

  it("keeps a frozen row when its key is missing from the live list", () => {
    const committed = [row("a", 0, 90), row("b", 1, 120), row("c", 2, 180)]
    const { frames } = buildPinnedFrames(committed, 3)
    const frame = frames[0]
    assert.ok(frame)
    const refreshed = refreshFrameRows(frame, [row("a", 0, 20)])
    assert.equal(refreshed.rows[0]?.arrival.timeToStation, 20)
    assert.equal(refreshed.rows[1]?.key, "b")
    assert.equal(refreshed.rows[1]?.arrival.timeToStation, 120)
  })
})
