import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { diagramAtomMetrics } from "./diagram-atoms.ts"
import {
  applyStationAbbreviations,
  arrivalsHeadingLadder,
  stationAbbreviationLadder,
} from "./station-abbreviations.ts"
import {
  approximateStationMeasure,
  formatStationLabel,
} from "./station-typography.ts"

describe("applyStationAbbreviations", () => {
  it("shortens Way, Station, and King's Cross together", () => {
    assert.equal(
      applyStationAbbreviations("King's Cross Station / York Way"),
      "King's X Stn / York w'y"
    )
  })

  it("accepts a missing or curly apostrophe in King's Cross", () => {
    assert.equal(
      applyStationAbbreviations("Kings Cross St. Pancras"),
      "King's X St. Pancras"
    )
    assert.equal(
      applyStationAbbreviations("King’s Cross St. Pancras"),
      "King's X St. Pancras"
    )
  })

  it("does not shorten other Cross or Way tokens", () => {
    assert.equal(applyStationAbbreviations("Charing Cross"), "Charing Cross")
    assert.equal(applyStationAbbreviations("Broadway"), "Broadway")
    assert.equal(applyStationAbbreviations("Stationary"), "Stationary")
  })
})

describe("formatStationLabel", () => {
  it("wraps South Kensington at the diagram label cap, keeps Bermondsey on one line", () => {
    const metrics = diagramAtomMetrics()
    const options = {
      maxWidth: metrics.labelMaxWidth,
      fontSize: metrics.nameSize,
      maxLines: 2 as const,
      allowAbbreviation: false,
      allowScaleDown: false,
    }
    const south = formatStationLabel(
      "South Kensington",
      approximateStationMeasure,
      options
    )
    assert.deepEqual(south.lines, ["South", "Kensington"])
    assert.equal(south.fits, true)
    const bermondsey = formatStationLabel(
      "Bermondsey",
      approximateStationMeasure,
      options
    )
    assert.deepEqual(bermondsey.lines, ["Bermondsey"])
    assert.equal(bermondsey.fits, true)
  })

  it("abbreviates a long bus stop heading to fit one line", () => {
    const result = formatStationLabel(
      "King's Cross Station / York Way",
      approximateStationMeasure,
      {
        maxWidth: 400,
        fontSize: 30,
        maxLines: 1,
        allowAbbreviation: true,
        allowScaleDown: true,
      }
    )
    assert.equal(result.abbreviated, true)
    assert.deepEqual(result.lines, ["King's X Stn / York w'y"])
    assert.equal(result.fits, true)
  })

  it("abbreviates King's Cross on a station destination when width is tight", () => {
    const result = formatStationLabel(
      "King's Cross St. Pancras",
      approximateStationMeasure,
      {
        maxWidth: 180,
        fontSize: 16,
        maxLines: 1,
        allowAbbreviation: true,
        allowScaleDown: true,
      }
    )
    assert.equal(result.abbreviated, true)
    assert.deepEqual(result.lines, ["King's X St. Pancras"])
    assert.equal(result.fits, true)
  })

  it("fits only the core name when a (for …) pointer is detached", () => {
    const result = formatStationLabel(
      "Cutty Sark (for Maritime Greenwich)",
      approximateStationMeasure,
      {
        maxWidth: 80,
        fontSize: 16,
        maxLines: 2,
        allowScaleDown: false,
        detachPlaceQualifier: true,
      }
    )
    assert.ok(
      result.lines.every((line) => !/\(for\b/i.test(line)),
      `box should not contain the bracket, got ${JSON.stringify(result.lines)}`
    )
    assert.equal(result.lines.join(" "), "Cutty Sark")
    assert.equal(result.qualifier, "(for Maritime Greenwich)")
    assert.equal(result.fits, true)
  })

  it("keeps the full name in the box when detach is off", () => {
    const result = formatStationLabel(
      "Custom House (for ExCel)",
      approximateStationMeasure,
      {
        maxWidth: 80,
        fontSize: 16,
        maxLines: 2,
        allowScaleDown: false,
      }
    )
    assert.ok(result.lines.join(" ").includes("ExCel"))
    assert.equal(result.qualifier, undefined)
  })
})

describe("abbreviation tiers", () => {
  it("steps word by word, then drops the via clause", () => {
    assert.deepEqual(
      stationAbbreviationLadder("Walthamstow Central via Highbury & Islington", 3),
      [
        "Walthamstow Ctrl via Highbury & Islington",
        "W'stow Ctrl via Highbury & Islington",
        "W'stow Ctrl",
      ]
    )
    assert.deepEqual(
      stationAbbreviationLadder("West Ruislip via Ealing Broadway", 3),
      ["West Ruislip via Ealing Bdwy", "West Ruislip"]
    )
  })

  it("keeps tier 1 as the default everywhere else", () => {
    assert.equal(applyStationAbbreviations("Ealing Broadway"), "Ealing Broadway")
    assert.equal(
      applyStationAbbreviations("Walthamstow Central"),
      "Walthamstow Ctrl"
    )
  })

  it("only goes as deep as the width needs", () => {
    const options = {
      fontSize: 10,
      maxLines: 1 as const,
      allowAbbreviation: true,
      allowScaleDown: false,
      abbreviationTier: 3 as const,
    }
    const fit = (maxWidth: number) =>
      formatStationLabel("Ealing Broadway", approximateStationMeasure, {
        ...options,
        maxWidth,
      }).lines.join(" ")
    assert.equal(fit(200), "Ealing Broadway")
    assert.equal(fit(65), "Ealing Bdwy")
  })
})

describe("arrivalsHeadingLadder", () => {
  it("steps full → NBound · Plat → NB · P", () => {
    assert.deepEqual(arrivalsHeadingLadder("Northbound · Platform 6"), [
      "Northbound · Platform 6",
      "NBound · Plat 6",
      "NB · P6",
    ])
    assert.deepEqual(arrivalsHeadingLadder("Westbound · Platform 12")[1], "WBound · Plat 12")
  })

  it("leaves rail designations alone", () => {
    assert.deepEqual(arrivalsHeadingLadder("Inner Rail · Platform 1"), [
      "Inner Rail · Platform 1",
      "Inner Rail · Plat 1",
      "Inner Rail · P1",
    ])
  })
})
