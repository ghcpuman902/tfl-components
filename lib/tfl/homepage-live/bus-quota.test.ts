import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { isDemoStopArrivalsId } from "@/lib/tfl/cached-stop-arrivals"
import {
  admitVisitorStop,
  BUS_BACKOFF_SEC,
  createMemoryStore,
  rowsKey,
  SITE_BUS_CALLS_PER_MIN,
  VISITOR_NEW_STOPS_PER_MIN,
} from "@/lib/tfl/homepage-live/bus-quota"
import {
  boardOutcome,
  BUS_BUSY,
  BusStopUnavailable,
  refreshBusStop,
  unavailableOutcome,
  type BusBoardRow,
} from "@/lib/tfl/homepage-live/bus-stop-arrivals"

const STOP = "490000129E"
const rows = (eta: number): BusBoardRow[] => [
  { route: "73", destination: "Stoke Newington", etaSec: eta, vehicleId: "LJ01" },
]

const setup = () => {
  let clock = Date.parse("2026-11-13T09:00:00Z")
  const store = createMemoryStore(() => clock)
  let calls = 0
  let outcome: () => Promise<BusBoardRow[]> = async () => rows(120)
  const deps = {
    store,
    now: () => clock,
    fetchRows: async () => {
      calls++
      return outcome()
    },
  }
  return {
    deps,
    store,
    calls: () => calls,
    advance: (ms: number) => void (clock += ms),
    failWith: (error: Error) => void (outcome = async () => Promise.reject(error)),
  }
}

describe("bus stop refresh under the site budget", () => {
  it("fetches any stop, not only the docs demo stops", async () => {
    const t = setup()
    assert.equal(isDemoStopArrivalsId(STOP), false)
    const snapshot = await refreshBusStop(STOP, t.deps)
    assert.equal(snapshot.state, "fresh")
    assert.equal(t.calls(), 1)
  })

  it("serves the last rows, not an error, when the site budget is spent", async () => {
    const t = setup()
    await refreshBusStop(STOP, t.deps)
    t.advance(25_000)
    const minute = Math.floor(Date.parse("2026-11-13T09:00:25Z") / 60_000)
    for (let i = 0; i < SITE_BUS_CALLS_PER_MIN; i++) await t.store.incr(`tfl:bus:site:${minute}`, 120)
    const served = await refreshBusStop(STOP, t.deps)
    assert.equal(served.state, "stale")
    assert.equal(served.rows[0]!.vehicleId, "LJ01")
    assert.equal(t.calls(), 1, "no extra TfL call over the budget")
    assert.equal(boardOutcome(served, Date.parse("2026-11-13T09:00:25Z")).updatedSecAgo, 25)
  })

  it("says busy in one sentence when the budget is spent and nothing was ever read", async () => {
    const t = setup()
    const minute = Math.floor(Date.parse("2026-11-13T09:00:00Z") / 60_000)
    for (let i = 0; i < SITE_BUS_CALLS_PER_MIN; i++) await t.store.incr(`tfl:bus:site:${minute}`, 120)
    await assert.rejects(refreshBusStop(STOP, t.deps), (error) => {
      assert.ok(error instanceof BusStopUnavailable)
      assert.equal(unavailableOutcome(error).error, BUS_BUSY)
      return true
    })
    assert.equal(t.calls(), 0)
  })

  it("leaves a stop alone for 60 s after a 429, serving what it had", async () => {
    const t = setup()
    await refreshBusStop(STOP, t.deps)
    t.advance(25_000)
    t.failWith(new Error("TfL answered 429 Too Many Requests"))
    const first = await refreshBusStop(STOP, t.deps)
    assert.equal(first.state, "stale")
    assert.equal(t.calls(), 2)
    t.advance(30_000)
    await refreshBusStop(STOP, t.deps)
    assert.equal(t.calls(), 2, "backed off: TfL was not asked again")
    t.advance(BUS_BACKOFF_SEC * 1000)
    await refreshBusStop(STOP, t.deps)
    assert.equal(t.calls(), 3, "asked again after the back-off")
  })

  it("does not back off for an ordinary failure, and keeps the last rows", async () => {
    const t = setup()
    await refreshBusStop(STOP, t.deps)
    t.advance(25_000)
    t.failWith(new Error("socket hang up"))
    assert.equal((await refreshBusStop(STOP, t.deps)).state, "stale")
    await refreshBusStop(STOP, t.deps)
    assert.equal(t.calls(), 3)
  })

  it("drops the last rows after two minutes", async () => {
    const t = setup()
    await refreshBusStop(STOP, t.deps)
    t.advance(125_000)
    assert.equal(await t.store.get(rowsKey(STOP)), null)
  })
})

describe("one visitor", () => {
  it("may open twenty new stops a minute; a stop already opened is free", async () => {
    const store = createMemoryStore()
    const at = Date.now()
    for (let i = 0; i < VISITOR_NEW_STOPS_PER_MIN; i++)
      assert.equal(await admitVisitorStop(store, "v1", `S${i}`, at), true)
    assert.equal(await admitVisitorStop(store, "v1", "S99", at), false)
    assert.equal(await admitVisitorStop(store, "v1", "S0", at), true)
    assert.equal(await admitVisitorStop(store, "v2", "S99", at), true)
  })
})

describe("rows served late", () => {
  it("count the wait out of each ETA", () => {
    const outcome = boardOutcome(
      { state: "stale", rows: rows(100), fetchedAt: 1_000_000 },
      1_000_000 + 40_000
    )
    assert.equal(outcome.rows[0]!.etaSec, 60)
    assert.equal(outcome.stale, true)
  })
})
