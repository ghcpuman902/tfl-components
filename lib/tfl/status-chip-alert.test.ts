import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  statusChipAlertFor,
  statusChipAlertForLine,
} from "@/lib/tfl/status-chip-alert"

const row = (
  statusSeverity: number,
  description: string,
  category?: string
) => ({
  statusSeverity,
  statusSeverityDescription: description,
  disruption: category ? { category } : undefined,
})

describe("statusChipAlertFor", () => {
  it("adds nothing for good service", () => {
    assert.equal(statusChipAlertFor(row(10, "Good Service")), undefined)
    assert.equal(statusChipAlertFor(undefined), undefined)
  })

  it("marks minor delays as minor", () => {
    assert.equal(
      statusChipAlertFor(row(9, "Minor Delays", "RealTime")),
      "minor"
    )
    assert.equal(
      statusChipAlertFor(row(7, "Reduced Service", "RealTime")),
      "minor"
    )
  })

  it("marks severe delays and suspensions as severe", () => {
    assert.equal(
      statusChipAlertFor(row(6, "Severe Delays", "RealTime")),
      "severe"
    )
    assert.equal(statusChipAlertFor(row(2, "Suspended", "RealTime")), "severe")
    assert.equal(
      statusChipAlertFor(row(3, "Part Suspended", "RealTime")),
      "severe"
    )
  })

  it("leaves the overnight timetable closure quiet", () => {
    assert.equal(statusChipAlertFor(row(20, "Service Closed")), undefined)
  })

  it("uses the worst operative status for a line", () => {
    assert.equal(
      statusChipAlertForLine([
        row(9, "Minor Delays", "RealTime"),
        row(6, "Severe Delays", "RealTime"),
      ]),
      "severe"
    )
    assert.equal(statusChipAlertForLine([]), undefined)
  })
})
