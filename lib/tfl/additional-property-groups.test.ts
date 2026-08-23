import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  groupAdditionalProperties,
  nearestPlacePrefix,
} from "./additional-property-groups"

const prop = (
  key: string,
  value: string,
  category?: string
): { key: string; value: string; category?: string } => ({
  key,
  value,
  category,
})

describe("nearestPlacePrefix", () => {
  it("reads the system id before the underscore", () => {
    assert.equal(nearestPlacePrefix("BikePoints_64"), "BikePoints")
    assert.equal(nearestPlacePrefix("TaxiRank_5506"), "TaxiRank")
  })
})

describe("groupAdditionalProperties", () => {
  it("drops lifted Direction / SMS keys and splits nearest places", () => {
    const grouped = groupAdditionalProperties([
      prop("Towards", "Aldwych", "Direction"),
      prop("CompassPoint", "E", "Direction"),
      prop("WiFi", "yes", "Facility"),
      prop("Zone", "1", "Geo"),
      prop("SourceSystemPlaceId", "BikePoints_64", "NearestPlaces"),
      prop("SourceSystemPlaceId", "BikePoints_83", "NearestPlaces"),
      prop("SourceSystemPlaceId", "TaxiRank_5506", "NearestPlaces"),
    ])
    assert.equal(grouped.extraCount, 5)
    assert.deepEqual(
      grouped.groups.map((group) => group.category),
      ["Facility", "Geo"]
    )
    assert.deepEqual(
      grouped.nearestPlaces.map((bucket) => ({
        prefix: bucket.prefix,
        label: bucket.label,
        count: bucket.values.length,
      })),
      [
        { prefix: "BikePoints", label: "Bike hire", count: 2 },
        { prefix: "TaxiRank", label: "Taxi ranks", count: 1 },
      ]
    )
  })

  it("treats SourceSystemPlaceId as nearest places without a category", () => {
    const grouped = groupAdditionalProperties([
      prop("SourceSystemPlaceId", "BikePoints_341"),
    ])
    assert.equal(grouped.groups.length, 0)
    assert.deepEqual(grouped.nearestPlaces[0]?.values, ["BikePoints_341"])
  })
})
