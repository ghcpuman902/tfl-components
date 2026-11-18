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
  serveBusStopBoard,
  unavailableOutcome,
  type BusBoardRow,
} from "@/lib/tfl/homepage-live/bus-stop-arrivals"
import {
  pickQuotaStore,
  resetMemoryStoreAnnouncement,
} from "@/lib/tfl/homepage-live/bus-stop-cache"

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

  it("flag a fresh entry as stale once it is older than 90 s", () => {
    const entry = { state: "fresh" as const, rows: rows(300), fetchedAt: 1_000_000 }
    assert.equal(boardOutcome(entry, 1_000_000 + 30_000).stale, false)
    assert.equal(boardOutcome(entry, 1_000_000 + 91_000).stale, true)
  })
})

describe("a visitor over their own cap", () => {
  const serve = (t: ReturnType<typeof setup>, admit: boolean) =>
    serveBusStopBoard(STOP, {
      store: t.store,
      admitVisitor: async () => admit,
      snapshot: () => refreshBusStop(STOP, t.deps),
      now: t.deps.now,
    })

  it("still gets the last rows, labelled with their age, not an immediate busy", async () => {
    const t = setup()
    await refreshBusStop(STOP, t.deps)
    t.advance(35_000)
    const outcome = await serve(t, false)
    assert.equal(outcome.ok, true)
    if (!outcome.ok) return
    assert.equal(outcome.stale, true)
    assert.equal(outcome.updatedSecAgo, 35)
    assert.equal(outcome.rows[0]!.etaSec, 85)
    assert.equal(t.calls(), 1, "no TfL call for a visitor over their cap")
  })

  it("gets the busy sentence only when the stop has nothing to show", async () => {
    const t = setup()
    const outcome = await serve(t, false)
    assert.deepEqual(outcome, { ok: false, kind: "busy", error: BUS_BUSY })
    assert.equal(t.calls(), 0)
  })

  it("is served rows, never an empty list, while the stop is backed off after a 429", async () => {
    const t = setup()
    await refreshBusStop(STOP, t.deps)
    t.advance(25_000)
    t.failWith(new Error("TfL answered 429 Too Many Requests"))
    const outcome = await serve(t, true)
    assert.equal(outcome.ok && outcome.stale, true)
    assert.equal(outcome.ok && outcome.rows.length, 1)
  })

  it("serves the busy sentence, not zero rows, when a 429 leaves nothing held", async () => {
    const t = setup()
    t.failWith(new Error("TfL answered 429 Too Many Requests"))
    const outcome = await serve(t, true)
    assert.deepEqual(outcome, { ok: false, kind: "busy", error: BUS_BUSY })
  })
})

describe("the quota store", () => {
  it("is memory when Redis is unset, and says so once in the log", () => {
    resetMemoryStoreAnnouncement()
    const lines: string[] = []
    const first = pickQuotaStore(null, (line) => lines.push(line))
    const second = pickQuotaStore(null, (line) => lines.push(line))
    assert.equal(first, second)
    assert.equal(lines.length, 1)
    assert.doesNotMatch(lines[0]!, /redis:\/\//i)
  })

  it("is Redis when a client is present, without logging", () => {
    resetMemoryStoreAnnouncement()
    const lines: string[] = []
    const redis = { get: async () => null }
    const store = pickQuotaStore(redis, (line) => lines.push(line))
    assert.notEqual(store, pickQuotaStore(null, () => {}))
    assert.equal(lines.length, 0)
  })
})
