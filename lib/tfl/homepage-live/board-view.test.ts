import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import {
  BusBoardView,
  formatEta,
  StationBoardView,
} from "@/components/home/board-view"
import { compactRound } from "@/lib/tfl/homepage-live/compact"
import { replayArrivalsRound } from "@/lib/tfl/homepage-live/fixture"
import { computeFrame } from "@/lib/tfl/homepage-live/replay-frame"
import { replayRoundsFor } from "@/lib/tfl/homepage-live/replay-params"
import { buildStationBoard } from "@/lib/tfl/homepage-live/station-board"

const frame = computeFrame(
  replayRoundsFor({ fixture: "kx", round: 10 }).map((i) => {
    const r = replayArrivalsRound(i)
    return compactRound(r.rows, r.receivedAt)
  })
)
const sections = buildStationBoard({
  rows: frame.rows,
  trains: frame.snapshot.trains,
  stopIds: ["940GZZLUKSX"],
  receivedAt: frame.receivedAt,
  lineOrder: ["victoria", "piccadilly", "northern", "circle"],
})

const noop = () => {}
const station = (props: Partial<Parameters<typeof StationBoardView>[0]> = {}) =>
  renderToStaticMarkup(
    createElement(StationBoardView, {
      title: "King's Cross St. Pancras",
      subtitle: "6 lines",
      sections,
      status: "ok",
      activeKey: null,
      selectedKey: null,
      onActive: noop,
      onSelect: noop,
      ...props,
    })
  )

describe("the station Board", () => {
  it("shows each line with a column per platform and times as Due or minutes", () => {
    const html = station()
    for (const text of ["Victoria", "Piccadilly", "Northern", "Northbound · Platform 3", "Southbound · Platform 4", "Circle · H &amp; City · Metropolitan"])
      assert.ok(html.includes(text), text)
    assert.ok(/(Due|\d+ min)/.test(html))
  })

  it("labels shared-track trains Beta and leaves placed trains unlabelled", () => {
    const html = station()
    assert.ok(html.includes(">Beta<"))
    const victoria = station({ sections: sections.filter((s) => s.id === "victoria") })
    assert.ok(!victoria.includes(">Beta<"))
  })

  it("makes a row a button only when the map shows its train", () => {
    const html = station()
    const linked = sections.flatMap((s) => s.columns.flatMap((c) => c.entries)).filter((e) => e.link !== "none").length
    assert.equal((html.match(/<button/g) ?? []).length, linked)
    assert.ok(html.includes('aria-pressed="false"'))
  })

  it("marks the selected row", () => {
    const entry = sections[0]!.columns[0]!.entries.find((e) => e.link !== "none")!
    assert.ok(station({ selectedKey: entry.key }).includes('aria-pressed="true"'))
  })

  it("holds its height with skeletons before the first poll, and says one sentence when it fails", () => {
    const loading = station({ status: "loading", sections: [] })
    assert.ok(loading.includes("animate-pulse"))
    assert.ok(!loading.includes("<button"))
    const failed = station({ status: "error", error: "Live trains are unavailable right now. The map will retry.", sections: [] })
    assert.ok(failed.includes("Live trains are unavailable right now. The map will retry."))
  })

  it("says so when nothing is due", () => {
    assert.ok(station({ sections: [] }).includes("No trains are due here"))
  })
})

describe("the bus stop Board", () => {
  const rows = [
    { route: "205", destination: "Bow Church", etaSec: 20, vehicleId: "A" },
    { route: "73", destination: "Oxford Circus", etaSec: 240, vehicleId: "B" },
  ]
  it("shows the stop letter, its routes and the next buses", () => {
    const html = renderToStaticMarkup(
      createElement(BusBoardView, {
        title: "King's Cross Station",
        stopLetter: "E",
        towards: "Angel Islington",
        routes: ["205", "73"],
        rows,
        status: "ok",
      })
    )
    for (const text of ["King&#x27;s Cross Station", "towards Angel Islington", "Bow Church", "Due", "4 min"])
      assert.ok(html.includes(text), text)
    assert.ok(html.includes(">E<"))
  })

  it("handles loading, empty and failure", () => {
    const base = { title: "X", routes: [], rows: [] }
    assert.ok(renderToStaticMarkup(createElement(BusBoardView, { ...base, status: "loading" })).includes("animate-pulse"))
    assert.ok(renderToStaticMarkup(createElement(BusBoardView, { ...base, status: "ok" })).includes("No buses are due"))
    assert.ok(renderToStaticMarkup(createElement(BusBoardView, { ...base, status: "error", error: "This stop is not available on the site key. Add your own TfL API key." })).includes("site key"))
  })

  it("formats times", () => {
    assert.equal(formatEta(10), "Due")
    assert.equal(formatEta(95), "2 min")
  })
})
