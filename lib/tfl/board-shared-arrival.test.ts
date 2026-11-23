import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { boardTopCardParts, isSharedArrival } from "./board-shared-arrival"

describe("boardTopCardParts", () => {
  it("shows nothing when neither part applies", () => {
    assert.equal(
      boardTopCardParts({
        glance: false,
        sharedArrival: false,
        homeScreenTip: false,
      }),
      null
    )
  })

  it("shows the shared part alone", () => {
    assert.deepEqual(
      boardTopCardParts({
        glance: false,
        sharedArrival: true,
        homeScreenTip: false,
      }),
      { shared: true, homeScreen: false }
    )
  })

  it("shows the home screen part alone", () => {
    assert.deepEqual(
      boardTopCardParts({
        glance: false,
        sharedArrival: false,
        homeScreenTip: true,
      }),
      { shared: false, homeScreen: true }
    )
  })

  it("folds both parts into one card", () => {
    assert.deepEqual(
      boardTopCardParts({
        glance: false,
        sharedArrival: true,
        homeScreenTip: true,
      }),
      { shared: true, homeScreen: true }
    )
  })

  it("never shows on the glance view", () => {
    assert.equal(
      boardTopCardParts({
        glance: true,
        sharedArrival: true,
        homeScreenTip: true,
      }),
      null
    )
  })
})

describe("isSharedArrival", () => {
  it("reads ?shared=1 only", () => {
    assert.equal(isSharedArrival("?shared=1"), true)
    assert.equal(isSharedArrival("?shared=0"), false)
    assert.equal(isSharedArrival(""), false)
  })
})
