import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { compactRound } from "@/lib/tfl/homepage-live/compact"
import { replayArrivalsRound } from "@/lib/tfl/homepage-live/fixture"
import { computeFrame } from "@/lib/tfl/homepage-live/replay-frame"
import { replayRoundsFor } from "@/lib/tfl/homepage-live/replay-params"
import {
  BOARD_ROWS_PER_COLUMN,
  buildStationBoard,
  busesDueWithin,
  trainsAroundStation,
} from "@/lib/tfl/homepage-live/station-board"

describe("buses due at a stop", () => {
  it("counts distinct buses inside the window, not trains", () => {
    const rows = [
      { route: "73", vehicleId: "A", etaSec: 60 },
      { route: "73", vehicleId: "A", etaSec: 65 },
      { route: "30", vehicleId: "B", etaSec: 599 },
      { route: "205", vehicleId: "C", etaSec: 601 },
      { route: "214", etaSec: 120 },
    ]
    assert.equal(busesDueWithin(rows), 3)
    assert.equal(busesDueWithin([]), 0)
  })
})

const KX = ["940GZZLUKSX"]
const frameAt = (round: number) =>
  computeFrame(
    replayRoundsFor({ fixture: "kx", round }).map((i) => {
      const recorded = replayArrivalsRound(i)
      return compactRound(recorded.rows, recorded.receivedAt)
    })
  )
const frame = frameAt(10)
const board = buildStationBoard({
  rows: frame.rows,
  trains: frame.snapshot.trains,
  stopIds: KX,
  receivedAt: frame.receivedAt,
  lineOrder: ["victoria", "piccadilly", "northern", "circle", "hammersmith-city", "metropolitan"],
})

describe("King's Cross Board at 300 s of the recording", () => {
  it("has the six lines, Circle, H&C and Metropolitan as one section, with a column per platform", () => {
    assert.deepEqual(
      board.map((s) => s.id),
      ["victoria", "piccadilly", "northern", "subsurface"]
    )
    assert.deepEqual([...board[3]!.lineIds].sort(), ["circle", "hammersmith-city", "metropolitan"])
    for (const section of board) assert.ok(section.columns.length >= 2)
  })

  it("lists at most three trains per platform, soonest first", () => {
    for (const column of board.flatMap((s) => s.columns)) {
      assert.ok(column.entries.length <= BOARD_ROWS_PER_COLUMN)
      const etas = column.entries.map((e) => e.etaSec)
      assert.deepEqual(etas, [...etas].sort((a, b) => a - b))
    }
  })

  it("links every row to the train the map draws, and never to a hidden one", () => {
    const byKey = new Map(frame.snapshot.trains.map((t) => [t.key, t]))
    let linked = 0
    for (const entry of board.flatMap((s) => s.columns.flatMap((c) => c.entries))) {
      const train = byKey.get(entry.key)
      if (entry.link === "none") {
        assert.ok(!train || train.status === "hidden")
        continue
      }
      linked++
      assert.equal(train?.status, entry.link)
      assert.ok(train?.position)
    }
    assert.ok(linked > 5, `only ${linked} rows link to a map train`)
  })

  it("draws Victoria, Piccadilly, Northern and Metropolitan trains as placed and Circle and H&C trains as Beta", () => {
    const entries = board.flatMap((s) => s.columns.flatMap((c) => c.entries))
    for (const e of entries.filter((x) => ["circle", "hammersmith-city"].includes(x.lineId)))
      assert.notEqual(e.link, "placed")
    assert.ok(entries.some((e) => e.link === "placed"))
    assert.ok(entries.some((e) => e.lineId === "metropolitan" && e.link === "placed"))
  })

  it("draws the trains within ten minutes, each also on the Board or hidden, and keeps both views on one key", () => {
    const around = trainsAroundStation({
      rows: frame.rows,
      trains: frame.snapshot.trains,
      stopIds: KX,
      receivedAt: frame.receivedAt,
    })
    assert.ok(around.length >= 10 && around.length <= 70, `${around.length} trains around KX`)
    assert.ok(around.every((t) => t.status !== "hidden" && t.position))
    const keys = new Set(around.map((t) => t.key))
    for (const entry of board.flatMap((s) => s.columns.flatMap((c) => c.entries)))
      if (entry.link !== "none" && entry.etaSec <= 600) assert.ok(keys.has(entry.key), entry.key)
  })

  it("gives the same Board for the same replay frame", () => {
    const again = frameAt(10)
    const rebuilt = buildStationBoard({
      rows: again.rows,
      trains: again.snapshot.trains,
      stopIds: KX,
      receivedAt: again.receivedAt,
      lineOrder: ["victoria", "piccadilly", "northern", "circle", "hammersmith-city", "metropolitan"],
    })
    assert.deepEqual(rebuilt, board)
  })

  it("counts every ETA down by the age of the poll and drops rows that have left", () => {
    const entriesOf = (sections: typeof board) =>
      new Map(sections.flatMap((s) => s.columns.flatMap((c) => c.entries)).map((e) => [e.key, e.etaSec]))
    const at = (ageSec: number) =>
      buildStationBoard({
        rows: frame.rows,
        trains: frame.snapshot.trains,
        stopIds: KX,
        receivedAt: frame.receivedAt,
        ageSec,
        lineOrder: [],
      })
    const now = entriesOf(at(0))
    const later = entriesOf(at(60))
    let counted = 0
    for (const [key, eta] of later) {
      const before = now.get(key)
      if (before == null) continue
      assert.equal(eta, Math.max(0, before - 60), key)
      counted += 1
    }
    assert.ok(counted > 5, `only ${counted} rows could be compared`)
    const gone = [...now.keys()].filter((key) => !later.has(key))
    assert.ok(gone.length > 0, "rows 60 s past their ETA at the start have left by now")
  })
})
