import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  buildObservatoryAlertText,
  selectNewObservatoryAlerts,
} from "@/lib/tfl/observatory/email"
import type { ObservatoryHistoryEvent } from "@/lib/tfl/observatory/types"

const event = (
  overrides: Partial<ObservatoryHistoryEvent> = {}
): ObservatoryHistoryEvent => ({
  id: "confirmation:stops:district:1:changed",
  at: "2026-08-20T04:15:00.000Z",
  kind: "confirmation",
  subjectId: "stops:district",
  subjectLabel: "District line stop points",
  state: "changed",
  summary: "2 stop points added on the District line.",
  details: ["2 stop points added on the District line: New Halt, Newer Halt."],
  ...overrides,
})

describe("observatory email alerts", () => {
  it("sends a new confirmed change once", () => {
    const first = selectNewObservatoryAlerts(
      [event()],
      {},
      "2026-08-20T04:15:00.000Z"
    )
    assert.equal(first.toSend.length, 1)
    const second = selectNewObservatoryAlerts(
      [event()],
      first.nextNotified,
      "2026-08-21T04:15:00.000Z"
    )
    assert.equal(second.toSend.length, 0)
  })

  it("ignores current and suspect events", () => {
    const selected = selectNewObservatoryAlerts(
      [
        event({
          state: "suspect",
          summary: "2 stop points added on the District line.",
        }),
      ],
      {},
      "2026-08-20T04:15:00.000Z"
    )
    assert.equal(selected.toSend.length, 0)
  })

  it("writes a readable alert body", () => {
    const text = buildObservatoryAlertText([event()])
    assert.match(text, /District line stop points/)
    assert.match(text, /2 stop points added/)
    assert.match(text, /\/observatory/)
  })
})
