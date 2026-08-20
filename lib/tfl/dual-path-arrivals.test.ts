import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  arrivalsBelongToStops,
  selectArrivalsDataPath,
  shouldPausePollingForVisibility,
} from "./dual-path-arrivals"

describe("selectArrivalsDataPath", () => {
  it("uses site path when empty", () => {
    assert.equal(selectArrivalsDataPath("empty"), "site")
  })

  it("uses site path while validating (until ready)", () => {
    assert.equal(selectArrivalsDataPath("validating"), "site")
  })

  it("uses user path when ready", () => {
    assert.equal(selectArrivalsDataPath("ready"), "user")
  })

  it("stays on user path when invalid (no site-key fallback)", () => {
    assert.equal(selectArrivalsDataPath("invalid"), "user")
  })
})

describe("shouldPausePollingForVisibility", () => {
  it("pauses when hidden", () => {
    assert.equal(shouldPausePollingForVisibility("hidden"), true)
  })

  it("does not pause when visible", () => {
    assert.equal(shouldPausePollingForVisibility("visible"), false)
  })
})

describe("arrivalsBelongToStops", () => {
  it("accepts an empty payload", () => {
    assert.equal(arrivalsBelongToStops([], ["940GZZLULVT"]), true)
  })

  it("accepts a hub sibling naptan", () => {
    assert.equal(
      arrivalsBelongToStops(
        [{ naptanId: "910GLIVST" }],
        ["940GZZLULVT", "910GLIVST"]
      ),
      true
    )
  })

  it("rejects a payload from a different stop", () => {
    assert.equal(
      arrivalsBelongToStops(
        [{ naptanId: "940GZZLUOXC" }],
        ["940GZZLULVT", "910GLIVST"]
      ),
      false
    )
  })
})
