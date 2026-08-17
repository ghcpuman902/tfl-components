import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { buildPinnedFrames } from "@/lib/tfl/arrivals-unattended-frames"
import type { ArrivalsPreparedRow } from "@/lib/tfl/arrivals-prepare"
import type { RealtimePrediction } from "tfl-ts"

const row = (key: string, index: number): ArrivalsPreparedRow => ({
  key,
  sourceIndex: index,
  arrival: { id: key } as RealtimePrediction,
})

const keys = (frames: ReturnType<typeof buildPinnedFrames>["frames"]) =>
  frames.map((frame) => frame.rows.map((item) => item.key))

describe("buildPinnedFrames", () => {
  it("pins the first arrival and rotates the remaining slots", () => {
    const rows = Array.from({ length: 10 }, (_, index) =>
      row(`r${index + 1}`, index)
    )
    const { frames, pageCount } = buildPinnedFrames(rows, 4)
    assert.equal(pageCount, 3)
    assert.deepEqual(keys(frames), [
      ["r1", "r2", "r3", "r4"],
      ["r1", "r5", "r6", "r7"],
      ["r1", "r8", "r9", "r10"],
    ])
    assert.deepEqual(frames[0]?.ranks, [1, 2, 3, 4])
    assert.deepEqual(frames[1]?.ranks, [1, 5, 6, 7])
    assert.deepEqual(frames[2]?.ranks, [1, 8, 9, 10])
  })

  it("keeps ranks stable when the first arrival is pinned", () => {
    const rows = [row("a", 0), row("b", 1), row("c", 2), row("d", 3), row("e", 4)]
    const { frames } = buildPinnedFrames(rows, 3)
    assert.deepEqual(frames[0]?.ranks, [1, 2, 3])
    assert.deepEqual(frames[1]?.ranks, [1, 4, 5])
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
