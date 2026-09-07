import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  formatStationName,
  splitStationPlaceQualifier,
  stationQualifierSide,
} from "./diagram-station.ts"

describe("splitStationPlaceQualifier", () => {
  it("detaches Cutty Sark and Custom House attraction pointers", () => {
    assert.deepEqual(
      splitStationPlaceQualifier("Cutty Sark (for Maritime Greenwich) DLR Station"),
      {
        core: "Cutty Sark",
        qualifier: "(for Maritime Greenwich)",
      }
    )
    assert.deepEqual(
      splitStationPlaceQualifier("Custom House (for ExCel)"),
      {
        core: "Custom House",
        qualifier: "(for ExCel)",
      }
    )
  })

  it("keeps place-name parentheses in the box", () => {
    assert.deepEqual(splitStationPlaceQualifier("Kensington (Olympia)"), {
      core: "Kensington (Olympia)",
    })
    assert.deepEqual(splitStationPlaceQualifier("Burnham (Berks) Rail Station"), {
      core: "Burnham (Berks)",
    })
  })

  it("leaves line-disambiguation names as formatStationName does", () => {
    assert.deepEqual(
      splitStationPlaceQualifier("Edgware Road (Circle Line) Underground Station"),
      { core: formatStationName("Edgware Road (Circle Line) Underground Station") }
    )
  })
})

describe("stationQualifierSide", () => {
  it("paints the qualifier away from the line, below when unknown", () => {
    assert.equal(stationQualifierSide("below"), "above")
    assert.equal(stationQualifierSide("above"), "below")
    assert.equal(stationQualifierSide("left"), "right")
    assert.equal(stationQualifierSide("right"), "left")
    assert.equal(stationQualifierSide(), "below")
  })
})
