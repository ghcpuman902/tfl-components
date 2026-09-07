import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { applyStationAbbreviations } from "./station-abbreviations.ts"
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
