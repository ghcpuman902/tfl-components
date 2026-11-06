import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  BOARD_SHARE_OG_DEFAULT_NAME,
  resolveBoardShareOg,
  resolveBoardShareOgLines,
} from "./board-share-og"

describe("board share OG", () => {
  it("uses Tower Hill's District and Circle, never King's Cross sample lines", () => {
    const model = resolveBoardShareOg({
      stop: "940GZZLUTWH",
      stopName: "Tower Hill",
    })
    assert.equal(model.stationName, "Tower Hill")
    const ids = model.lines.map((line) => line.id)
    assert.ok(ids.includes("district"))
    assert.ok(ids.includes("circle"))
    assert.equal(ids.includes("victoria"), false)
    assert.equal(ids.includes("piccadilly"), false)
  })

  it("honours a.lines order over catalog membership", () => {
    const lines = resolveBoardShareOgLines("940GZZLUTWH", [
      "circle",
      "district",
    ])
    assert.deepEqual(
      lines.map((line) => line.id),
      ["circle", "district"]
    )
  })

  it("falls back to the default station name when bare", () => {
    const model = resolveBoardShareOg({})
    assert.equal(model.stationName, BOARD_SHARE_OG_DEFAULT_NAME)
    assert.ok(model.lines.length > 0)
  })

  it("resolves Oxford Circus lines without inventing bus routes", () => {
    const model = resolveBoardShareOg({ stop: "940GZZLUOXC" })
    assert.match(model.stationName, /Oxford Circus/)
    const ids = model.lines.map((line) => line.id)
    assert.ok(ids.includes("central") || ids.includes("victoria") || ids.includes("bakerloo"))
    assert.equal(ids.includes("73"), false)
  })
})
