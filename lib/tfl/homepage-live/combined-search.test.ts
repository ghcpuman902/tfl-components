import assert from "node:assert/strict"
import { before, describe, it } from "node:test"
import {
  combinedReducer,
  createLiveSearch,
  initialCombinedState,
  SEARCH_FAILED,
  SEARCH_TIMEOUT,
  type CombinedState,
  type Timers,
} from "@/lib/tfl/homepage-live/combined-search"
import {
  loadStopSearch,
  type LiveStopHit,
  type StopSearchKit,
} from "@/lib/tfl/stop-index"

let kit: StopSearchKit
before(async () => {
  kit = await loadStopSearch()
})

const fakeTimers = () => {
  let now = 0
  let next = 1
  const queue = new Map<number, { at: number; fn: () => void }>()
  const timers: Timers = {
    set: (fn, ms) => {
      queue.set(next, { at: now + ms, fn })
      return next++
    },
    clear: (handle) => void queue.delete(handle as number),
  }
  const advance = (ms: number) => {
    const until = now + ms
    for (;;) {
      const due = [...queue.entries()]
        .filter(([, t]) => t.at <= until)
        .sort((a, b) => a[1].at - b[1].at)[0]
      if (!due) break
      queue.delete(due[0])
      now = due[1].at
      due[1].fn()
    }
    now = until
  }
  return { timers, advance }
}

type Deferred = {
  query: string
  signal: AbortSignal
  resolve: (hits: LiveStopHit[]) => void
  reject: () => void
}

const harness = () => {
  const clock = fakeTimers()
  let state: CombinedState = initialCombinedState
  const requests: Deferred[] = []
  const search = createLiveSearch({
    timers: clock.timers,
    instantFor: (query) => kit.searchStops(kit.index, query),
    merge: () => kit.mergeLiveResults,
    fetchLive: (query, signal) =>
      new Promise((resolve, reject) => {
        requests.push({ query, signal, resolve, reject: () => reject(new Error("down")) })
      }),
    dispatch: (action) => {
      state = combinedReducer(state, action)
    },
  })
  const settle = () => new Promise<void>((done) => setImmediate(done))
  return { clock, search, requests, settle, get state() { return state } }
}

const ids = (rows: readonly { id: string }[]) => rows.map((row) => row.id)
const bus = (id: string, name: string): LiveStopHit => ({
  id,
  name,
  stopLetter: "Z",
  towards: "Nowhere",
  lines: ["999"],
  modes: ["bus"],
})

describe("combined search", () => {
  it("shows index rows synchronously on the keystroke", () => {
    const h = harness()
    h.search.type("kings cross")
    assert.ok(h.state.rows.length > 0)
    assert.equal(h.state.rows[0]!.kind, "station")
    assert.match(h.state.rows[0]!.name, /King's Cross/)
    h.search.type("tow")
    assert.ok(h.state.rows.some((row) => row.name === "Tower Hill"))
    assert.equal(h.requests.length, 0)
  })

  it("appends TfL-only stops below and leaves the index rows alone", async () => {
    const h = harness()
    h.search.type("tow")
    const before = ids(h.state.rows)
    h.clock.advance(180)
    h.requests[0]!.resolve([bus("NEWSTOP1", "Towcester Road"), bus("NEWSTOP2", "Tow Lane")])
    await h.settle()
    const after = h.state.rows
    assert.deepEqual(ids(after).slice(0, before.length), before)
    assert.deepEqual(ids(after).slice(before.length), ["NEWSTOP1", "NEWSTOP2"])
    assert.ok(after.slice(before.length).every((row) => row.liveOnly))
    assert.equal(h.state.status, "ok")
  })

  it("keeps the highlighted row where it was", async () => {
    const h = harness()
    h.search.type("tow")
    const highlighted = h.state.rows[1]!.id
    h.clock.advance(180)
    h.requests[0]!.resolve([bus("NEWSTOP1", "Towcester Road")])
    await h.settle()
    assert.equal(kit.findHighlightedIndex(h.state.rows, highlighted), 1)
  })

  it("enriches a row TfL also returned, in place", async () => {
    const h = harness()
    h.search.type("kings cross")
    const before = h.state.rows
    const hub = before.find((row) => row.id === "HUBKGX")!
    assert.ok(!hub.lines.includes("zz-test-line"))
    h.clock.advance(180)
    h.requests[0]!.resolve([
      { id: "940GZZLUKSX", name: "King's Cross St. Pancras", modes: ["tube"], lines: ["zz-test-line"] },
    ])
    await h.settle()
    assert.deepEqual(ids(h.state.rows), ids(before))
    assert.ok(h.state.rows.find((row) => row.id === "HUBKGX")!.lines.includes("zz-test-line"))
  })

  it("sends one request for typing inside the debounce, aborts it on the next keystroke, ignores a late answer", async () => {
    const h = harness()
    h.search.type("tow")
    h.clock.advance(100)
    h.search.type("towe")
    h.clock.advance(179)
    assert.equal(h.requests.length, 0)
    h.clock.advance(1)
    assert.equal(h.requests.length, 1)
    assert.equal(h.requests[0]!.query, "towe")

    h.search.type("tower")
    assert.equal(h.requests[0]!.signal.aborted, true)
    const rowsForTower = ids(h.state.rows)
    h.requests[0]!.resolve([bus("LATE", "Late Stop")])
    await h.settle()
    assert.deepEqual(ids(h.state.rows), rowsForTower)
    assert.equal(h.state.status, "pending")
  })

  it("keeps the list and says one sentence when TfL fails or times out", async () => {
    const failed = harness()
    failed.search.type("tow")
    const rows = ids(failed.state.rows)
    failed.clock.advance(180)
    failed.requests[0]!.reject()
    await failed.settle()
    assert.equal(failed.state.status, "failed")
    assert.equal(failed.state.message, SEARCH_FAILED)
    assert.deepEqual(ids(failed.state.rows), rows)

    const slow = harness()
    slow.search.type("tow")
    slow.clock.advance(180 + 8_000)
    assert.equal(slow.state.status, "failed")
    assert.equal(slow.state.message, SEARCH_TIMEOUT)
    assert.ok(slow.state.rows.length > 0)
    assert.equal(slow.requests[0]!.signal.aborted, true)
  })

  it("merging the same TfL payload twice gives the same list", async () => {
    const h = harness()
    h.search.type("tow")
    h.clock.advance(180)
    const hits = [bus("NEWSTOP1", "Towcester Road")]
    h.requests[0]!.resolve(hits)
    await h.settle()
    const once = h.state.rows
    const again = combinedReducer(h.state, {
      type: "live",
      attempt: h.state.attempt,
      hits,
      merge: kit.mergeLiveResults,
    })
    assert.deepEqual(ids(again.rows), ids(once))
    assert.equal(again.rows, once)
  })

  it("does not ask TfL for one character", () => {
    const h = harness()
    h.search.type("k")
    h.clock.advance(1_000)
    assert.equal(h.requests.length, 0)
    assert.equal(h.state.status, "idle")
  })
})
