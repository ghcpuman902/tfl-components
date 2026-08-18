import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { ServicePatternDataset } from "./service-pattern-evidence"
import { matchExternalStopPatterns } from "./cross-source-pattern-matching"

const dataset: ServicePatternDataset = {
  lineId: "test",
  lineName: "Test",
  stationCount: 5,
  branchSegmentCount: 1,
  patterns: [
    {
      id: "tfl:test:outbound:1",
      source: "tfl-static-sequence",
      name: "A to E",
      direction: "outbound",
      serviceType: "Regular",
      stationIds: ["a", "b", "c", "d", "e"],
      stationNames: ["A Rail Station", "B", "C", "D", "E"],
    },
  ],
  movements: [],
  directionPairs: [],
  fields: [],
}

describe("matchExternalStopPatterns", () => {
  it("finds an exact subpath inside a longer TfL pattern", () => {
    const [match] = matchExternalStopPatterns(dataset, [
      { id: "osm:1", stopNames: ["B", "C", "D"] },
    ])
    assert.equal(match?.kind, "exact")
    assert.deepEqual(match?.omittedStationNames, [])
  })

  it("reports calls omitted by a limited-stop relation", () => {
    const [match] = matchExternalStopPatterns(dataset, [
      { id: "osm:2", stopNames: ["A", "C", "E"] },
    ])
    assert.equal(match?.kind, "limited-stop")
    assert.deepEqual(match?.omittedStationNames, ["B", "D"])
  })
})
