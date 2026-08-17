import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { parseTflLineStrings } from "@/lib/tfl/bus-route-geometry"

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

  it("skips malformed strings", () => {
    assert.deepEqual(parseTflLineStrings(["not-json"]), [])
  })
})
