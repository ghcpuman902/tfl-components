import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  collectOrderedStopIds,
  parseTflLineStrings,
} from "@/lib/tfl/bus-route-geometry"

describe("parseTflLineStrings", () => {
  it("parses a LineString coordinate array", () => {
    const lines = parseTflLineStrings(["[[-0.1,51.5],[-0.11,51.51]]"])
    assert.equal(lines.length, 1)
    assert.equal(lines[0]?.coordinates.length, 2)
    assert.deepEqual(lines[0]?.coordinates[0], [-0.1, 51.5])
  })

  it("flattens a MultiLineString encoding", () => {
    const lines = parseTflLineStrings([
      "[[[-0.1,51.5],[-0.11,51.51]],[[-0.12,51.5],[-0.13,51.51]]]",
    ])
    assert.equal(lines.length, 2)
  })

  it("drops duplicate Superloop encodings", () => {
    const raw = "[[[-0.1,51.5],[-0.11,51.51]],[[-0.12,51.5],[-0.13,51.51]]]"
    const lines = parseTflLineStrings([raw, raw])
    assert.equal(lines.length, 2)
  })

  it("skips malformed strings", () => {
    assert.deepEqual(parseTflLineStrings(["not-json"]), [])
  })
})

describe("collectOrderedStopIds", () => {
  it("unions Superloop terminus variants onto the longest spine", () => {
    const ids = collectOrderedStopIds([
      { naptanIds: ["a", "b", "bus-station"] },
      { naptanIds: ["a", "b", "central"] },
    ])
    assert.deepEqual(ids, ["a", "b", "bus-station", "central"])
  })

  it("prefers the longer spine when lengths differ", () => {
    const ids = collectOrderedStopIds([
      { naptanIds: ["a", "b"] },
      { naptanIds: ["a", "b", "c", "d"] },
    ])
    assert.deepEqual(ids, ["a", "b", "c", "d"])
  })

  it("falls back when no ordered routes exist", () => {
    assert.deepEqual(collectOrderedStopIds([], ["x", "y"]), ["x", "y"])
  })
})
