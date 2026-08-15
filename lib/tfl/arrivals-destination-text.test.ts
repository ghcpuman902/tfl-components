import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  isRedundantArrivalsDestination,
  resolveArrivalsDestinationText,
} from "@/lib/tfl/arrivals-destination-text"

describe("isRedundantArrivalsDestination", () => {
  it("matches the line name with or without the 'Line' suffix", () => {
    assert.equal(isRedundantArrivalsDestination("Circle Line", "Circle"), true)
    assert.equal(isRedundantArrivalsDestination("Circle", "Circle Line"), true)
    assert.equal(
      isRedundantArrivalsDestination("Circle Line", "Circle Line"),
      true,
    )
  })

  it("is case-insensitive and trims whitespace", () => {
    assert.equal(
      isRedundantArrivalsDestination("  circle line  ", "Circle"),
      true,
    )
  })

  it("is false for a real destination", () => {
    assert.equal(
      isRedundantArrivalsDestination("Edgware Road", "Circle"),
      false,
    )
  })

  it("is false when either side is blank", () => {
    assert.equal(isRedundantArrivalsDestination("", "Circle"), false)
    assert.equal(isRedundantArrivalsDestination("Circle", ""), false)
  })
})

describe("resolveArrivalsDestinationText", () => {
  it("leaves a real destination unchanged", () => {
    assert.equal(
      resolveArrivalsDestinationText({
        destination: "Edgware Road",
        lineName: "Circle",
      }),
      "Edgware Road",
    )
  })

  it("combines a line-redundant destination with currentLocation", () => {
    assert.equal(
      resolveArrivalsDestinationText({
        destination: "Circle Line",
        lineName: "Circle",
        currentLocation: "At South Kensington Platform 1",
      }),
      "Circle Line · At South Kensington Platform 1",
    )
  })

  it("falls back to the destination unchanged with no currentLocation", () => {
    assert.equal(
      resolveArrivalsDestinationText({
        destination: "Circle Line",
        lineName: "Circle",
      }),
      "Circle Line",
    )
  })

  it("returns Check Front of Train unabbreviated, alone", () => {
    // Abbreviation to "Check Front" is StationName's job (shared table),
    // only when it doesn't fit — this function never pre-shortens it.
    assert.equal(
      resolveArrivalsDestinationText({
        destination: "Check Front of Train",
        lineName: "District",
      }),
      "Check Front of Train",
    )
  })

  it("combines Check Front of Train with currentLocation", () => {
    assert.equal(
      resolveArrivalsDestinationText({
        destination: "Check Front of Train",
        lineName: "District",
        currentLocation: "At Southfields Platform 1",
      }),
      "Check Front of Train · At Southfields Platform 1",
    )
  })

  it("ignores TfL's literal 'null' currentLocation", () => {
    assert.equal(
      resolveArrivalsDestinationText({
        destination: "Check Front of Train",
        lineName: "District",
        currentLocation: "null",
      }),
      "Check Front of Train",
    )
  })

  it("tolerates a missing lineName", () => {
    assert.equal(
      resolveArrivalsDestinationText({ destination: "Edgware Road" }),
      "Edgware Road",
    )
  })
})
