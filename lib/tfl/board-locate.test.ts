import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  locateFailureAction,
  locateFailureFromGeolocation,
  locateFailureSentence,
  locatePlatform,
} from "./board-locate"

const SAFARI_IOS =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"
const INSTAGRAM_IOS = `${SAFARI_IOS} Instagram 350.0.0`
const IPAD_DESKTOP_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15"

describe("board locate failures", () => {
  it("tells a blocked site from an in-app browser", () => {
    assert.equal(locateFailureFromGeolocation(1, SAFARI_IOS), "denied")
    assert.equal(locateFailureFromGeolocation(1, INSTAGRAM_IOS), "in-app")
    assert.equal(locateFailureFromGeolocation(2, SAFARI_IOS), "unavailable")
    assert.equal(locateFailureFromGeolocation(3, SAFARI_IOS), "timeout")
  })

  it("treats an iPad asking for the desktop site as iOS", () => {
    assert.equal(locatePlatform(IPAD_DESKTOP_UA, 5), "ios")
    assert.equal(locatePlatform(IPAD_DESKTOP_UA, 0), "mac")
  })

  it("names the fallback only when it is showing", () => {
    assert.equal(
      locateFailureSentence("denied", "Oxford Circus", "mac"),
      "Location is blocked for this site, so we're showing Oxford Circus."
    )
    assert.equal(
      locateFailureSentence("in-app", null, "ios"),
      "Open in Safari to use your location."
    )
  })

  it("offers help for a block and a retry for a flaky fix", () => {
    assert.equal(locateFailureAction("denied"), "help")
    assert.equal(locateFailureAction("timeout"), "retry")
    assert.equal(locateFailureAction("in-app"), null)
  })
})
