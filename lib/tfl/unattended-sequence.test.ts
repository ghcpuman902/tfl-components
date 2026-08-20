import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  UNATTENDED_DEFAULT_DWELL_MS,
  createUnattendedSequence,
  reconcileUnattendedSequence,
  resumeUnattendedSequence,
  splitTextFrames,
  tickUnattendedSequence,
  unattendedDwellProgress,
} from "@/lib/tfl/unattended-sequence"

const IDS = ["a", "b", "c"] as const

describe("createUnattendedSequence", () => {
  it("starts on the first item", () => {
    const state = createUnattendedSequence({ itemIds: IDS, nowMs: 0 })
    assert.equal(state.index, 0)
    assert.equal(state.itemId, "a")
    assert.equal(state.elapsedMs, 0)
  })

  it("handles an empty list", () => {
    const state = createUnattendedSequence({ itemIds: [], nowMs: 0 })
    assert.equal(state.index, 0)
    assert.equal(state.itemId, null)
  })
})

describe("tickUnattendedSequence", () => {
  it("does not advance a single-frame sequence", () => {
    let state = createUnattendedSequence({ itemIds: ["only"], nowMs: 0 })
    state = tickUnattendedSequence(state, {
      itemIds: ["only"],
      nowMs: UNATTENDED_DEFAULT_DWELL_MS * 3,
    })
    assert.equal(state.index, 0)
    assert.equal(state.itemId, "only")
  })

  it("advances after the default dwell", () => {
    let state = createUnattendedSequence({ itemIds: IDS, nowMs: 0 })
    state = tickUnattendedSequence(state, {
      itemIds: IDS,
      nowMs: UNATTENDED_DEFAULT_DWELL_MS,
    })
    assert.equal(state.index, 1)
    assert.equal(state.itemId, "b")
    assert.equal(state.elapsedMs, 0)
  })

  it("does not shorten dwell when the sequence has more frames", () => {
    const many = ["a", "b", "c", "d", "e", "f"] as const
    let short = createUnattendedSequence({ itemIds: IDS, nowMs: 0 })
    let long = createUnattendedSequence({ itemIds: many, nowMs: 0 })
    short = tickUnattendedSequence(short, {
      itemIds: IDS,
      nowMs: UNATTENDED_DEFAULT_DWELL_MS - 1,
    })
    long = tickUnattendedSequence(long, {
      itemIds: many,
      nowMs: UNATTENDED_DEFAULT_DWELL_MS - 1,
    })
    assert.equal(short.itemId, "a")
    assert.equal(long.itemId, "a")
    short = tickUnattendedSequence(short, {
      itemIds: IDS,
      nowMs: UNATTENDED_DEFAULT_DWELL_MS,
    })
    long = tickUnattendedSequence(long, {
      itemIds: many,
      nowMs: UNATTENDED_DEFAULT_DWELL_MS,
    })
    assert.equal(short.itemId, "b")
    assert.equal(long.itemId, "b")
  })

  it("honours a shorter dwell override", () => {
    let state = createUnattendedSequence({ itemIds: IDS, nowMs: 0 })
    state = tickUnattendedSequence(state, {
      itemIds: IDS,
      nowMs: 2_000,
      dwellMs: 2_000,
    })
    assert.equal(state.itemId, "b")
  })

  it("waits for startDelay before the first advance", () => {
    let state = createUnattendedSequence({
      itemIds: IDS,
      nowMs: 0,
      startDelayMs: 3_000,
    })
    state = tickUnattendedSequence(state, {
      itemIds: IDS,
      nowMs: 3_000,
      dwellMs: 10_000,
    })
    assert.equal(state.itemId, "a")
    state = tickUnattendedSequence(state, {
      itemIds: IDS,
      nowMs: 13_000,
      dwellMs: 10_000,
    })
    assert.equal(state.itemId, "b")
  })

  it("pauses on focus", () => {
    let state = createUnattendedSequence({ itemIds: IDS, nowMs: 0 })
    state = tickUnattendedSequence(state, {
      itemIds: IDS,
      nowMs: 16_000,
      pauseReasons: ["focus"],
    })
    assert.equal(state.itemId, "a")
  })

  it("pauses while hidden and restarts dwell on resume", () => {
    let state = createUnattendedSequence({ itemIds: IDS, nowMs: 0 })
    state = tickUnattendedSequence(state, {
      itemIds: IDS,
      nowMs: 4_000,
    })
    assert.equal(state.elapsedMs, 4_000)
    state = tickUnattendedSequence(state, {
      itemIds: IDS,
      nowMs: 20_000,
      pauseReasons: ["hidden"],
    })
    assert.equal(state.itemId, "a")
    state = resumeUnattendedSequence(state, 20_000)
    assert.equal(state.elapsedMs, 0)
    state = tickUnattendedSequence(state, {
      itemIds: IDS,
      nowMs: 29_000,
    })
    assert.equal(state.itemId, "a")
    state = tickUnattendedSequence(state, {
      itemIds: IDS,
      nowMs: 30_000,
    })
    assert.equal(state.itemId, "b")
  })

  it("loops after the last frame", () => {
    let state = createUnattendedSequence({ itemIds: IDS, nowMs: 0 })
    state = tickUnattendedSequence(state, {
      itemIds: IDS,
      nowMs: UNATTENDED_DEFAULT_DWELL_MS * 3,
    })
    assert.equal(state.itemId, "a")
  })
})

describe("unattendedDwellProgress", () => {
  it("stays at 0 for a single frame", () => {
    const state = createUnattendedSequence({ itemIds: ["only"], nowMs: 0 })
    assert.equal(unattendedDwellProgress(state, { itemCount: 1 }), 0)
  })

  it("reports elapsed share of the dwell", () => {
    let state = createUnattendedSequence({ itemIds: IDS, nowMs: 0 })
    state = tickUnattendedSequence(state, {
      itemIds: IDS,
      nowMs: 2_500,
    })
    assert.equal(
      unattendedDwellProgress(state, { itemCount: IDS.length }),
      0.25
    )
  })
})

describe("reconcileUnattendedSequence", () => {
  it("keeps the current item when the list reorders", () => {
    const state = createUnattendedSequence({ itemIds: IDS, nowMs: 0 })
    const next = tickUnattendedSequence(state, {
      itemIds: IDS,
      nowMs: UNATTENDED_DEFAULT_DWELL_MS,
    })
    const reordered = reconcileUnattendedSequence(next, ["c", "b", "a"])
    assert.equal(reordered.itemId, "b")
    assert.equal(reordered.index, 1)
  })

  it("moves to the nearest remaining item when the current one disappears", () => {
    let state = createUnattendedSequence({ itemIds: IDS, nowMs: 0 })
    state = tickUnattendedSequence(state, {
      itemIds: IDS,
      nowMs: UNATTENDED_DEFAULT_DWELL_MS,
    })
    const next = reconcileUnattendedSequence(state, ["a", "c"])
    assert.equal(next.itemId, "c")
    assert.equal(next.index, 1)
  })

  it("clears the sequence when every item disappears", () => {
    const state = createUnattendedSequence({ itemIds: IDS, nowMs: 0 })
    const next = reconcileUnattendedSequence(state, [])
    assert.equal(next.itemId, null)
    assert.equal(next.index, 0)
  })
})

describe("splitTextFrames", () => {
  it("returns one frame when copy fits", () => {
    assert.deepEqual(splitTextFrames("Severe delays.", 80), ["Severe delays."])
  })

  it("splits on sentence boundaries", () => {
    const frames = splitTextFrames(
      "Severe delays between Oxford Circus and Warren Street. Valid tickets are accepted on local buses.",
      60
    )
    assert.equal(frames.length, 2)
    assert.equal(
      frames[0],
      "Severe delays between Oxford Circus and Warren Street."
    )
    assert.equal(frames[1], "Valid tickets are accepted on local buses.")
  })

  it("wraps a single overlong sentence on words", () => {
    const frames = splitTextFrames(
      "Severe delays between Oxford Circus and Warren Street because of a signal failure",
      40
    )
    assert.ok(frames.length >= 2)
    assert.ok(frames.every((frame) => frame.length <= 40))
    assert.equal(
      frames.join(" "),
      "Severe delays between Oxford Circus and Warren Street because of a signal failure"
    )
  })

  it("returns no frames for empty copy", () => {
    assert.deepEqual(splitTextFrames("   ", 40), [])
  })
})
