import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  arrivalsOrdinalSuffix,
  formatArrivalsRankLabel,
} from "@/components/tfl/arrivals/chip-text"

describe("arrivalsOrdinalSuffix", () => {
  it("uses st/nd/rd/th, including the teen exceptions", () => {
    assert.equal(arrivalsOrdinalSuffix(1), "st")
    assert.equal(arrivalsOrdinalSuffix(2), "nd")
    assert.equal(arrivalsOrdinalSuffix(3), "rd")
    assert.equal(arrivalsOrdinalSuffix(4), "th")
    assert.equal(arrivalsOrdinalSuffix(11), "th")
    assert.equal(arrivalsOrdinalSuffix(12), "th")
    assert.equal(arrivalsOrdinalSuffix(13), "th")
    assert.equal(arrivalsOrdinalSuffix(21), "st")
    assert.equal(arrivalsOrdinalSuffix(22), "nd")
    assert.equal(arrivalsOrdinalSuffix(23), "rd")
  })
})

describe("formatArrivalsRankLabel", () => {
  it("joins the digit and suffix", () => {
    assert.equal(formatArrivalsRankLabel(1), "1st")
    assert.equal(formatArrivalsRankLabel(12), "12th")
  })
})
