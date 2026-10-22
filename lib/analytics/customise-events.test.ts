import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { ANALYTICS_EVENT_NAMES } from "./events"
import {
  CUSTOMISE_EVENT_NAMES,
  createCustomiseEventLogger,
  type CustomiseEvent,
} from "./customise-events"

describe("customise events", () => {
  it("are known analytics events", () => {
    for (const name of CUSTOMISE_EVENT_NAMES) {
      assert.ok((ANALYTICS_EVENT_NAMES as readonly string[]).includes(name))
    }
  })

  it("only split-assigned visits are sent; every event stays local", () => {
    for (const source of [
      "param",
      "override",
      "default",
      "assigned",
    ] as const) {
      const sent: CustomiseEvent[] = []
      const local: CustomiseEvent[] = []
      const log = createCustomiseEventLogger({
        variant: "r",
        source,
        send: (event) => sent.push(event),
        local: (event) => local.push(event),
      })
      log("customise_done")
      assert.equal(local.length, 1)
      assert.equal(sent.length, source === "assigned" ? 1 : 0)
    }
  })
})
