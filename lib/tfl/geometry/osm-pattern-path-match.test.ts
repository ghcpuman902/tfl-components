import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { OsmRouteStopsFile } from "./osm-route-stops"
import {
  externalPatternsFromOsmRelations,
  matchOsmRelationsForMode,
} from "./osm-pattern-path-match"

/**
 * Mirrors the real OSM route relations for the Waterloo & City line
 * (relation 102762 / 7672074): exactly two stop-position members each,
 * Waterloo and Bank, nothing from the lines sharing track near Bank.
 */
const waterlooAndCityFile: OsmRouteStopsFile = {
  meta: { relationCount: 2, retrievedAt: "2026-08-18T00:00:00.000Z" },
  stops: [],
  relations: [
    {
      relationId: 102762,
      tags: { name: "Waterloo & City line: Waterloo → Bank" },
      stops: [
        { nodeId: 1, role: "stop", name: "Waterloo" },
        { nodeId: 2, role: "stop", name: "Bank" },
      ],
    },
    {
      relationId: 7672074,
      tags: { name: "Waterloo & City line: Bank → Waterloo" },
      stops: [
        { nodeId: 2, role: "stop", name: "Bank" },
        { nodeId: 1, role: "stop", name: "Waterloo" },
      ],
    },
  ],
}

describe("osm-pattern-path-match", () => {
  it("builds one external pattern per relation, in member order", () => {
    const patterns = externalPatternsFromOsmRelations(waterlooAndCityFile)
    assert.equal(patterns.length, 2)
    assert.deepEqual(patterns[0]?.pattern.stopNames, ["Waterloo", "Bank"])
    assert.deepEqual(patterns[1]?.pattern.stopNames, ["Bank", "Waterloo"])
  })

  it("matches Waterloo & City relations to exactly two stations, never a shared-track neighbour", () => {
    const matches = matchOsmRelationsForMode("tube", waterlooAndCityFile)
    const onWaterlooAndCity = matches.filter(
      (match) => match.lineId === "waterloo-city",
    )
    assert.equal(onWaterlooAndCity.length, 2)
    for (const match of onWaterlooAndCity) {
      assert.equal(match.kind, "exact")
      assert.deepEqual(match.omittedStationNames, [])
    }

    // No other Tube line has a two-stop Waterloo<->Bank pattern to match against,
    // so relation membership never attributes this route to a different line.
    const onOtherLines = matches.filter(
      (match) => match.lineId !== "waterloo-city",
    )
    assert.equal(onOtherLines.length, 0)
  })

  it("returns nothing for relations with fewer than two named stops", () => {
    const patterns = externalPatternsFromOsmRelations({
      meta: { relationCount: 1, retrievedAt: "2026-08-18T00:00:00.000Z" },
      stops: [],
      relations: [
        { relationId: 1, tags: {}, stops: [{ nodeId: 1, role: "stop" }] },
      ],
    })
    assert.equal(patterns.length, 0)
  })
})
