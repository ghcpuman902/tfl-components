import assert from "node:assert/strict"
import { it } from "node:test"
import { getLineColor } from "tfl-ts/ui"
import { ogChipTextColor } from "@/lib/og/chip-text"

const WHITE = "#FFFFFF"

it("puts white text on dark line chips, Metropolitan included", () => {
  for (const id of [
    "metropolitan",
    "northern",
    "piccadilly",
    "district",
    "central",
    "elizabeth",
    "victoria",
    "bakerloo",
  ]) {
    assert.equal(ogChipTextColor(getLineColor(id).hex), WHITE, id)
  }
})

it("keeps ink on light chips", () => {
  for (const id of ["circle", "hammersmith-city", "waterloo-city"]) {
    assert.notEqual(ogChipTextColor(getLineColor(id).hex), WHITE, id)
  }
})
