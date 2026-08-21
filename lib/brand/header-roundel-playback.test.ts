import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  headerRoundelCell,
  nextHeaderRoundelPhase,
} from "./header-roundel-playback"

describe("header roundel playback", () => {
  it("plays intro to rest, then hover accel/loop and unhover decel", () => {
    assert.equal(nextHeaderRoundelPhase("intro", false), "rest")
    assert.equal(nextHeaderRoundelPhase("intro", true), "accel")
    assert.equal(nextHeaderRoundelPhase("accel", true), "loop")
    assert.equal(nextHeaderRoundelPhase("accel", false), "decel")
    assert.equal(nextHeaderRoundelPhase("loop", true), "loop")
    assert.equal(nextHeaderRoundelPhase("loop", false), "decel")
    assert.equal(nextHeaderRoundelPhase("decel", false), "rest")
    assert.equal(nextHeaderRoundelPhase("decel", true), "accel")
  })

  it("addresses atlas cells in row-major order", () => {
    assert.equal(headerRoundelCell(0, 12, 64, 64).viewBox, "0 0 64 64")
    assert.equal(headerRoundelCell(12, 12, 64, 64).viewBox, "0 64 64 64")
    assert.equal(headerRoundelCell(13, 12, 64, 64).viewBox, "64 64 64 64")
  })
})
