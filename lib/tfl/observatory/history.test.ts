import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { groupHistoryRuns } from "@/lib/tfl/observatory/history"
import type { ObservatoryHistoryEvent } from "@/lib/tfl/observatory/types"

const event = (
  overrides: Partial<ObservatoryHistoryEvent>
): ObservatoryHistoryEvent => ({
  id: overrides.id ?? "run",
  at: "2026-08-19T04:15:00.000Z",
  kind: "scheduled",
  subjectId: null,
  subjectLabel: "Observation run",
  state: "observed",
  summary: "Observation completed. No metadata change.",
  details: [],
  ...overrides,
})

describe("history runs", () => {
  it("groups one pass into a single all-normal run", () => {
    const runs = groupHistoryRuns([
      event({
        counts: [
          {
            id: "bus-lines",
            label: "Bus lines",
            observedCount: 641,
            baselineCount: 641,
            state: "current",
          },
        ],
      }),
    ])
    assert.equal(runs.length, 1)
    assert.equal(runs[0]?.abnormal.length, 0)
    assert.equal(runs[0]?.rows.length, 6)
    assert.equal(
      runs[0]?.rows.find((row) => row.id === "bus-lines")?.observedCount,
      641
    )
  })

  it("orders abnormal rows by severity and keeps others normal", () => {
    const runs = groupHistoryRuns([
      event({ id: "run" }),
      event({
        id: "stops",
        subjectId: "stops:district",
        subjectLabel: "District line stop points",
        state: "changed",
        summary: "1 stop point added.",
      }),
      event({
        id: "census",
        subjectId: "census:bike-points",
        subjectLabel: "Cycle hire docks",
        state: "incomplete",
        summary: "500 vs 798 (-298). Outside the 10% band.",
      }),
    ])
    assert.equal(
      runs[0]?.abnormal.map((row) => row.state).join(","),
      "incomplete,changed"
    )
    assert.equal(runs[0]?.abnormal.length, 2)
    assert.equal(
      runs[0]?.rows.filter((row) => row.state === "current").length,
      4
    )
  })
})
