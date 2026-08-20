import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  CHART_WEEKS,
  DAY_MS,
  dayMark,
  eventsOnLocalDay,
  monthLabelsForGrid,
  observationChartGrid,
  rowStateForDay,
  startOfLocalDay,
  startOfLocalWeek,
  worstHistoryState,
} from "@/lib/tfl/observatory/chart"

describe("observation chart grid", () => {
  it("builds 53 Monday-first weeks ending this week", () => {
    const now = new Date(2026, 7, 19, 15, 8, 0).getTime()
    const { start, today, weeks } = observationChartGrid(now)
    assert.equal(today, startOfLocalDay(now))
    assert.equal(weeks.length, CHART_WEEKS)
    assert.equal(weeks[0]?.[0], start)
    assert.equal(new Date(start).getDay(), 1)
    assert.equal(weeks.at(-1)?.[0], startOfLocalWeek(now))
    assert.equal(weeks.at(-1)?.[6], startOfLocalWeek(now) + 6 * DAY_MS)
  })

  it("labels a month on the week that contains the first", () => {
    const now = new Date(2026, 7, 19, 12, 0, 0).getTime()
    const { weeks } = observationChartGrid(now)
    const labels = monthLabelsForGrid(weeks, "en-GB")
    const august = labels.find((label) => label.label === "Aug")
    assert.ok(august)
    const firstAugust = weeks[august.weekIndex]?.find(
      (day) => new Date(day).getDate() === 1 && new Date(day).getMonth() === 7
    )
    assert.ok(firstAugust)
  })

  it("groups events by local day and picks the worst state", () => {
    const day = new Date(2026, 7, 19, 0, 0, 0).getTime()
    const rows = eventsOnLocalDay(
      [
        { at: new Date(2026, 7, 19, 4, 15).toISOString(), state: "observed" },
        { at: new Date(2026, 7, 19, 8, 0).toISOString(), state: "changed" },
        { at: new Date(2026, 7, 18, 8, 0).toISOString(), state: "suspect" },
      ],
      day
    )
    assert.equal(rows.length, 2)
    assert.equal(worstHistoryState(rows.map((row) => row.state)), "changed")
  })

  it("marks future gray, past gaps as missing, and quiet days as no change", () => {
    const today = new Date(2026, 7, 19, 0, 0, 0).getTime()
    assert.equal(dayMark(today + DAY_MS, today, []), "future")
    assert.equal(dayMark(today, today, []), "future")
    assert.equal(dayMark(today - DAY_MS, today, []), "missing")
    assert.equal(dayMark(today, today, ["observed"]), "quiet")
    assert.equal(dayMark(today, today, ["current", "changed"]), "changed")
  })

  it("breaks a day into rail datasets and count rows for the tooltip", () => {
    const day = new Date(2026, 7, 19, 0, 0, 0).getTime()
    const events = eventsOnLocalDay(
      [
        {
          at: new Date(2026, 7, 19, 4, 15).toISOString(),
          subjectId: null,
          state: "observed",
          summary: "Observation completed. No metadata change.",
        },
        {
          at: new Date(2026, 7, 19, 4, 15).toISOString(),
          subjectId: "stops:district",
          state: "changed",
          summary: "1 stop point added.",
        },
        {
          at: new Date(2026, 7, 19, 4, 15).toISOString(),
          subjectId: "census:bus-points",
          state: "current",
          summary: "32555 vs 32554 (+1). Within the normal band.",
        },
      ],
      day
    )

    assert.equal(rowStateForDay(events, "lines"), "current")
    assert.equal(rowStateForDay(events, "stops"), "changed")
    assert.equal(rowStateForDay(events, "routes"), "current")
    assert.equal(rowStateForDay(events, "bus-points"), "current")
    assert.equal(rowStateForDay(events, "bus-lines"), "current")
  })
})
