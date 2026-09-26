import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  buildThroughMovementWeight,
  stationIdByNodeIdFromNames,
} from "./branch-strip-through-movements.ts"
import {
  NORTHERN_LINE_SCHEMATIC_HORIZONTAL,
  RAW_NORTHERN_LINE_SCHEMATIC_HORIZONTAL,
} from "../fixtures/northern-line-schematic-horizontal.ts"

describe("stationIdByNodeIdFromNames", () => {
  it("resolves both Euston render nodes to the same real station id", () => {
    const map = stationIdByNodeIdFromNames(
      NORTHERN_LINE_SCHEMATIC_HORIZONTAL,
      "northern"
    )
    const bank = map.get("euston-bank")
    const cx = map.get("euston-cx")
    assert.ok(bank, "euston-bank should resolve to a real station id")
    assert.equal(bank, cx)
  })
})

describe("buildThroughMovementWeight", () => {
  it("confirms Camden Town's four legs are each a real through-move", () => {
    const stationIdByNodeId = stationIdByNodeIdFromNames(
      NORTHERN_LINE_SCHEMATIC_HORIZONTAL,
      "northern"
    )
    const weight = buildThroughMovementWeight("northern", stationIdByNodeId)
    for (const [a, b] of [
      ["chalk-farm", "euston-bank"],
      ["chalk-farm", "mornington-crescent"],
      ["kentish-town", "euston-bank"],
      ["kentish-town", "mornington-crescent"],
    ]) {
      const value = weight("camden-town", a!, b!)
      assert.ok(
        value != null && value > 0,
        `${a} ↔ ${b} via camden-town should be a confirmed through-move, got ${value}`
      )
    }
  })

  it("confirms Kennington Bank never through-runs to Battersea", () => {
    // Query against the RAW (pre-decomposition) fixture, which still has a
    // single "kennington" node id to key movements off — the decomposed
    // export this weight function feeds into is what splits it.
    const stationIdByNodeId = stationIdByNodeIdFromNames(
      RAW_NORTHERN_LINE_SCHEMATIC_HORIZONTAL,
      "northern"
    )
    const weight = buildThroughMovementWeight("northern", stationIdByNodeId)
    const value = weight("kennington", "elephant-castle", "nine-elms")
    assert.equal(
      value,
      0,
      "Bank ↔ Battersea via Kennington should be confirmed invalid (0), not unknown"
    )
    const validPair = weight("kennington", "elephant-castle", "oval")
    assert.ok(validPair != null && validPair > 0)
  })

  it("returns undefined for a line with no ordered-route data", () => {
    const weight = buildThroughMovementWeight("not-a-real-line", new Map())
    assert.equal(weight("a", "b", "c"), undefined)
  })
})
