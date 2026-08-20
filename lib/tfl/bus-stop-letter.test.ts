import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  getBusStopLetterFromPlatform,
  normaliseBusStopLetter,
  readStopLetter,
  resolveBusStopLetter,
  usableTflText,
} from "./bus-stop-letter"

describe("normaliseBusStopLetter", () => {
  it("accepts painted 1–2 letter codes", () => {
    assert.equal(normaliseBusStopLetter("e"), "E")
    assert.equal(normaliseBusStopLetter("RG"), "RG")
    assert.equal(normaliseBusStopLetter("Stop CV"), "CV")
  })

  it("drops compass arrows — not painted letters", () => {
    assert.equal(normaliseBusStopLetter("->W"), undefined)
    assert.equal(normaliseBusStopLetter("->E"), undefined)
    assert.equal(normaliseBusStopLetter("Stop ->W"), undefined)
  })

  it("does not invent a letter from a stand or name", () => {
    assert.equal(normaliseBusStopLetter("Stand 12"), undefined)
    assert.equal(normaliseBusStopLetter("Wapping Station"), undefined)
    assert.equal(normaliseBusStopLetter(""), undefined)
    assert.equal(normaliseBusStopLetter(undefined), undefined)
  })
})

describe("readStopLetter", () => {
  it("prefers stopLetter over indicator", () => {
    assert.equal(readStopLetter("g", "Stop R"), "G")
  })

  it("falls back to a short indicator", () => {
    assert.equal(readStopLetter(undefined, "Stop R"), "R")
    assert.equal(readStopLetter(undefined, "Stop RG"), "RG")
  })

  it("ignores arrow indicators instead of slicing to ->", () => {
    assert.equal(readStopLetter("->W", "->W"), undefined)
  })
})

describe("resolveBusStopLetter", () => {
  it("uses the explicit letter when painted", () => {
    assert.equal(resolveBusStopLetter("rg", [{ platformName: "E" }]), "RG")
  })

  it("sniffs 1–2 letter platformName from arrivals", () => {
    assert.equal(
      resolveBusStopLetter(undefined, [
        { platformName: "E" },
        { platformName: "RG" },
      ]),
      "E"
    )
    assert.equal(
      resolveBusStopLetter(undefined, [{ platformName: "RG" }]),
      "RG"
    )
  })

  it("does not treat an arrow platform as a letter", () => {
    assert.equal(resolveBusStopLetter("->W", [{ platformName: "->W" }]), null)
  })
})

describe("usableTflText", () => {
  it("drops TfL literal null sentinels", () => {
    assert.equal(usableTflText("null"), undefined)
    assert.equal(usableTflText("  NULL  "), undefined)
    assert.equal(
      usableTflText("Liverpool Street, Station"),
      "Liverpool Street, Station"
    )
  })
})

describe("getBusStopLetterFromPlatform", () => {
  it("accepts two-letter Oxford Circus platforms", () => {
    assert.equal(getBusStopLetterFromPlatform("RG"), "RG")
  })
})
