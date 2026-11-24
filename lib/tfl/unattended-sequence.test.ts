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
})

describe("unattendedDwellProgress", () => {
  it("stays at 0 for a single frame", () => {
    const state = createUnattendedSequence({ itemIds: ["only"], nowMs: 0 })
    assert.equal(unattendedDwellProgress(state, { itemCount: 1 }), 0)
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
})

/** Small seeded PRNG so the schedules are random but every run is the same. */
const prng = (seed: number) => () => {
  seed = (seed * 1_103_515_245 + 12_345) % 2 ** 31
  return seed / 2 ** 31
}

/**
 * Reference schedule, written independently of the tick loop: item k ends at
 * the running sum of each item's resolved dwell (max of base and its own need).
 */
const expectedAt = (
  ids: readonly string[],
  activeMs: number,
  options: { dwellMs?: number; dwellMsById?: Record<string, number> }
) => {
  const dwell = (id: string) =>
    Math.max(options.dwellMs ?? 10_000, options.dwellMsById?.[id] ?? 0)
  let index = 0
  let start = 0
  while (activeMs >= start + dwell(ids[index]!)) {
    start += dwell(ids[index]!)
    index = (index + 1) % ids.length
  }
  return {
    itemId: ids[index],
    elapsedMs: activeMs - start,
    dwellMs: dwell(ids[index]!),
  }
}

describe("rotation invariants (random schedules)", () => {
  it("shows the scheduled item at any time, however the ticks fall", () => {
    const random = prng(7)
    for (let run = 0; run < 200; run += 1) {
      const ids = ["a", "b", "c", "d", "e", "f"].slice(
        0,
        2 + Math.floor(random() * 5)
      )
      const dwellMs =
        random() < 0.3 ? 1_000 + Math.floor(random() * 15_000) : undefined
      const dwellMsById: Record<string, number> = {}
      for (const id of ids) {
        const roll = random()
        // fits (0), shorter than the base (never shortens) or a long scroll
        if (roll < 0.3) dwellMsById[id] = 0
        else if (roll < 0.5) dwellMsById[id] = 2_200
        else if (roll < 0.8)
          dwellMsById[id] = unattendedScrollDwellMs(
            1 + Math.floor(random() * 9)
          )
      }
      const options = { dwellMs, dwellMsById }
      let state = createUnattendedSequence({ itemIds: ids, nowMs: 0 })
      let now = 0
      for (let step = 0; step < 40; step += 1) {
        now +=
          random() < 0.1
            ? Math.floor(random() * 60_000)
            : Math.floor(random() * 1_500)
        state = tickUnattendedSequence(state, {
          itemIds: ids,
          nowMs: now,
          ...options,
        })
        const expected = expectedAt(ids, now, options)
        const label = `run ${run} at ${now}ms`
        assert.equal(state.itemId, expected.itemId, label)
        assert.equal(state.elapsedMs, expected.elapsedMs, label)
        assert.ok(
          expected.dwellMs >= (dwellMs ?? UNATTENDED_DEFAULT_DWELL_MS),
          label
        )
        assert.equal(
          unattendedDwellProgress(state, { itemCount: ids.length, ...options }),
          expected.elapsedMs / expected.dwellMs,
          label
        )
      }
    }
  })

  it("freezes while paused; a hidden resume restarts a full dwell", () => {
    const random = prng(11)
    const dwellMsById = { a: unattendedScrollDwellMs(7) }
    for (let run = 0; run < 200; run += 1) {
      let state = createUnattendedSequence({ itemIds: IDS, nowMs: 0 })
      let now = 0
      let active = 0 // time since the current schedule (re)started
      let offset = 0 // schedule position kept by a restart
      for (let step = 0; step < 30; step += 1) {
        const delta = Math.floor(random() * 8_000)
        now += delta
        const roll = random()
        if (roll < 0.2) {
          const before = state
          state = tickUnattendedSequence(state, {
            itemIds: IDS,
            nowMs: now,
            dwellMsById,
            pauseReasons: [roll < 0.1 ? "hidden" : "focus"],
          })
          assert.equal(state.itemId, before.itemId)
          assert.equal(state.elapsedMs, before.elapsedMs)
          if (roll < 0.1) {
            const restarts = state.restarts
            state = resumeUnattendedSequence(state, now)
            assert.equal(state.restarts, restarts + 1)
            assert.equal(
              unattendedDwellProgress(state, { itemCount: 3, dwellMsById }),
              0
            )
            offset = IDS.indexOf(state.itemId as (typeof IDS)[number])
            active = 0
          }
          continue
        }
        active += delta
        state = tickUnattendedSequence(state, {
          itemIds: IDS,
          nowMs: now,
          dwellMsById,
        })
        const rotated = [...IDS.slice(offset), ...IDS.slice(0, offset)]
        assert.equal(
          state.itemId,
          expectedAt(rotated, active, { dwellMsById }).itemId,
          `run ${run}`
        )
      }
    }
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
