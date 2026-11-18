import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { compactRound, expandRound } from "@/lib/tfl/homepage-live/compact"
import {
  ETA_ONLY_LINES,
  HomepageLiveEngine,
  PLACED_LINES,
} from "@/lib/tfl/homepage-live/engine"
import {
  replayArrivalsRound,
  replayRoundCount,
  type ReplayRound,
} from "@/lib/tfl/homepage-live/fixture"
import {
  lineGate,
  measureReplay,
} from "@/lib/tfl/homepage-live/replay-metrics"

const rounds: ReplayRound[] = Array.from(
  { length: replayRoundCount() },
  (_, i) => replayArrivalsRound(i)
)
const lines = [...rounds[0]!.byLine.keys()].sort()
const replay = measureReplay(rounds, lines)

describe("the compact wire format", () => {
  const compacted = measureReplay(
    rounds.map((round) => ({
      ...round,
      rows: expandRound(compactRound(round.rows, round.receivedAt)),
    })),
    lines
  )

  it("gives the same placed lines as the full poll", () => {
    const passing = lines.filter(
      (line) => lineGate(compacted.lines.get(line)!).length === 0
    )
    assert.deepEqual(passing.sort(), [...PLACED_LINES].sort())
  })

  it("is a fraction of the size of the raw poll", () => {
    const round = rounds[4]!
    const packed = JSON.stringify(compactRound(round.rows, round.receivedAt))
    assert.ok(packed.length < JSON.stringify(round.rows).length / 6)
  })
})

describe("recorded 13 Nov 2026 06:44-06:54, all 20 lines", () => {
  it("has 21 rounds of every line", () => {
    assert.equal(rounds.length, 21)
    assert.equal(lines.length, 20)
  })

  it("draws a line as exact only when it passes the replay gate", () => {
    const passing = lines.filter((line) => lineGate(replay.lines.get(line)!).length === 0)
    assert.deepEqual(passing.sort(), [...PLACED_LINES].sort())
  })

  it("never calls a line without location text placed", () => {
    for (const line of ETA_ONLY_LINES) {
      const m = replay.lines.get(line)!
      assert.equal(m.placed, 0, `${line} has no currentLocation in the feed`)
    }
  })

  it("keeps every shown train on a real position, and every hidden one reasoned", () => {
    for (const trains of replay.trains)
      for (const train of trains) {
        if (train.status === "hidden") {
          assert.equal(train.position, undefined)
          assert.ok(train.reason, `${train.key} hidden without a reason`)
        } else {
          assert.ok(Number.isFinite(train.position!.lat))
          assert.ok(Number.isFinite(train.position!.lon))
        }
      }
  })

  it("keys trains by line, so one vehicle id on several lines stays separate", () => {
    for (const trains of replay.trains) {
      const keys = trains.map((t) => t.key)
      assert.equal(new Set(keys).size, keys.length)
    }
    const linesById = new Map<string, Set<string>>()
    for (const train of replay.trains[0]!) {
      const set = linesById.get(train.vehicleId) ?? new Set<string>()
      set.add(train.lineId)
      linesById.set(train.vehicleId, set)
    }
    assert.ok(
      [...linesById.values()].some((set) => set.size > 1),
      "the recording reuses vehicle ids across lines"
    )
  })

  it("hides timetabled trips that have not started instead of pinning them to a stop", () => {
    const elizabeth = replay.lines.get("elizabeth")!
    assert.ok(elizabeth.hiddenByReason["far-eta"]! > elizabeth.beta)
    for (const train of replay.trains[5]!.filter((t) => t.reason === "far-eta"))
      assert.equal(train.position, undefined)
  })

  it("places DLR and tram trains as Beta, from chained and stale-read rows", () => {
    for (const line of ["dlr", "tram"]) {
      const m = replay.lines.get(line)!
      assert.ok(m.beta > 100, `${line} beta ${m.beta}`)
    }
    const ids = replay.trains[3]!.filter((t) => t.lineId === "dlr").map((t) => t.vehicleId)
    assert.ok(ids.some((id) => id.startsWith("~")))
  })

  it("keeps Northern on the right branch against later platform reports", () => {
    const m = replay.lines.get("northern")!
    assert.ok(m.branchChecks > 1000)
    assert.ok(m.branchCorrect / m.branchChecks >= 0.99)
  })

  it("is deterministic", () => {
    const run = () => {
      const engine = new HomepageLiveEngine()
      return rounds
        .slice(0, 5)
        .map((r) => engine.ingest(r.rows, r.receivedAt).trains.map((t) => [t.key, t.status, t.position?.lat, t.position?.lon]))
    }
    assert.deepEqual(run(), run())
  })
})
