import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  UNATTENDED_DEFAULT_DWELL_MS,
  UNATTENDED_SCROLL_HOLD_MS,
  UNATTENDED_SCROLL_MOVE_MS,
  createUnattendedSequence,
  reconcileUnattendedSequence,
  resolveUnattendedDwellMs,
  resumeUnattendedSequence,
  splitTextFrames,
  tickUnattendedSequence,
  unattendedDwellProgress,
  unattendedScrollDwellMs,
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

describe("unattendedScrollDwellMs", () => {
  it("is 0 when the copy fits", () => {
    assert.equal(unattendedScrollDwellMs(0), 0)
    assert.equal(unattendedScrollDwellMs(-1), 0)
  })

  it("holds the first window, then one move and hold per extra line", () => {
    assert.equal(UNATTENDED_SCROLL_HOLD_MS, 2200)
    assert.equal(UNATTENDED_SCROLL_MOVE_MS, 450)
    assert.equal(unattendedScrollDwellMs(1), 2200 + 2650)
    // 12 lines in a 5-line window: 7 steps.
    assert.equal(unattendedScrollDwellMs(7), 2200 + 7 * 2650)
    assert.equal(unattendedScrollDwellMs(7), 20_750)
  })
})

describe("resolveUnattendedDwellMs", () => {
  it("uses the base dwell when there is no per-item need", () => {
    assert.equal(resolveUnattendedDwellMs("a", {}), UNATTENDED_DEFAULT_DWELL_MS)
    assert.equal(resolveUnattendedDwellMs("a", { dwellMs: 4_000 }), 4_000)
    assert.equal(
      resolveUnattendedDwellMs(null, { dwellMsById: { a: 1 } }),
      10_000
    )
  })

  it("stretches to a longer scroll and never shortens a short notice", () => {
    const dwellMsById = {
      long: unattendedScrollDwellMs(7),
      short: 2_200,
      fits: 0,
    }
    assert.equal(resolveUnattendedDwellMs("long", { dwellMsById }), 20_750)
    assert.equal(resolveUnattendedDwellMs("short", { dwellMsById }), 10_000)
    assert.equal(resolveUnattendedDwellMs("fits", { dwellMsById }), 10_000)
  })
})

describe("tickUnattendedSequence with per-item dwell", () => {
  const dwellMsById = { a: unattendedScrollDwellMs(7) } // 20.75s

  it("holds a long item until its scroll has finished", () => {
    let state = createUnattendedSequence({ itemIds: IDS, nowMs: 0 })
    state = tickUnattendedSequence(state, {
      itemIds: IDS,
      nowMs: 20_000,
      dwellMsById,
    })
    assert.equal(state.itemId, "a")
    state = tickUnattendedSequence(state, {
      itemIds: IDS,
      nowMs: 20_750,
      dwellMsById,
    })
    assert.equal(state.itemId, "b")
    assert.equal(state.elapsedMs, 0)
  })

  it("keeps the normal dwell for items that fit, in 250ms ticks", () => {
    let state = createUnattendedSequence({ itemIds: IDS, nowMs: 0 })
    const changes: Array<[string | null, number]> = []
    for (let now = 250; now <= 41_000; now += 250) {
      const prev = state.itemId
      state = tickUnattendedSequence(state, {
        itemIds: IDS,
        nowMs: now,
        dwellMsById,
      })
      if (state.itemId !== prev) changes.push([state.itemId, now])
    }
    // a holds 20.75s for its scroll, then b and c keep the normal 10s.
    assert.deepEqual(changes, [
      ["b", 20_750],
      ["c", 30_750],
      ["a", 40_750],
    ])
  })

  it("reports progress against the stretched dwell", () => {
    let state = createUnattendedSequence({ itemIds: IDS, nowMs: 0 })
    state = tickUnattendedSequence(state, {
      itemIds: IDS,
      nowMs: 10_375,
      dwellMsById,
    })
    assert.equal(
      unattendedDwellProgress(state, { itemCount: IDS.length, dwellMsById }),
      0.5
    )
  })

  it("matches the single-dwell behaviour when no per-item map is given", () => {
    let a = createUnattendedSequence({ itemIds: IDS, nowMs: 0 })
    let b = createUnattendedSequence({ itemIds: IDS, nowMs: 0 })
    a = tickUnattendedSequence(a, { itemIds: IDS, nowMs: 25_000 })
    b = tickUnattendedSequence(b, {
      itemIds: IDS,
      nowMs: 25_000,
      dwellMsById: {},
    })
    assert.deepEqual(a, b)
    assert.equal(a.itemId, "c")
  })
})

describe("dwell restarts (progress bar sync)", () => {
  const dwellMsById = { a: unattendedScrollDwellMs(7) } // 20.75s

  it("starts at 0 and survives ticks and rotation", () => {
    let state = createUnattendedSequence({ itemIds: IDS, nowMs: 0 })
    assert.equal(state.restarts, 0)
    state = tickUnattendedSequence(state, { itemIds: IDS, nowMs: 25_000 })
    assert.equal(state.itemId, "c")
    assert.equal(state.restarts, 0)
  })

  it("bumps on resume and restarts the stretched dwell from empty", () => {
    let state = createUnattendedSequence({ itemIds: IDS, nowMs: 0 })
    state = tickUnattendedSequence(state, {
      itemIds: IDS,
      nowMs: 12_000,
      dwellMsById,
    })
    // Off-screen for 30s: frozen, still on the long item.
    state = tickUnattendedSequence(state, {
      itemIds: IDS,
      nowMs: 42_000,
      dwellMsById,
      pauseReasons: ["hidden"],
    })
    assert.equal(state.itemId, "a")
    state = resumeUnattendedSequence(state, 42_000)
    assert.equal(state.restarts, 1)
    assert.equal(
      unattendedDwellProgress(state, { itemCount: IDS.length, dwellMsById }),
      0
    )
    // Full 20.75s again after the restart, then the next item.
    state = tickUnattendedSequence(state, {
      itemIds: IDS,
      nowMs: 42_000 + 20_500,
      dwellMsById,
    })
    assert.equal(state.itemId, "a")
    state = tickUnattendedSequence(state, {
      itemIds: IDS,
      nowMs: 42_000 + 20_750,
      dwellMsById,
    })
    assert.equal(state.itemId, "b")
    assert.equal(state.restarts, 1)
  })

  it("focus pauses in place without a restart", () => {
    let state = createUnattendedSequence({ itemIds: IDS, nowMs: 0 })
    state = tickUnattendedSequence(state, { itemIds: IDS, nowMs: 4_000 })
    state = tickUnattendedSequence(state, {
      itemIds: IDS,
      nowMs: 9_000,
      pauseReasons: ["focus"],
    })
    assert.equal(state.elapsedMs, 4_000)
    assert.equal(state.restarts, 0)
  })
})
