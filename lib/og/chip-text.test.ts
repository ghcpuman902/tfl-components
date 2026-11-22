import assert from "node:assert/strict"
import { it } from "node:test"
import { ogLineChipTextColor } from "@/lib/og/chip-text"
import { TFL_BLUE } from "@/lib/tfl/brand-colours"

const WHITE = "#FFFFFF"

it("puts TfL blue ink on Circle, H&C, W&C and Coaches, like LineBadge", () => {
  for (const id of ["circle", "hammersmith-city", "waterloo-city", "coaches"]) {
    assert.equal(ogLineChipTextColor(id), TFL_BLUE, id)
  }
})

it("puts white ink on every other line, Metropolitan and buses included", () => {
  for (const id of [
    "metropolitan",
    "northern",
    "piccadilly",
    "district",
    "central",
    "elizabeth",
    "victoria",
    "bakerloo",
    "jubilee",
    "dlr",
    "buses",
    "liberty",
  ]) {
    assert.equal(ogLineChipTextColor(id), WHITE, id)
  }
})

it("decides by line id, not by colour contrast", () => {
  // The old 3:1 rule gave Circle near-black ink (#171717) and would give
  // other light chips ink too. The real rule is blue, and only for listed ids.
  assert.notEqual(ogLineChipTextColor("circle"), "#171717")
  assert.equal(ogLineChipTextColor("CIRCLE"), TFL_BLUE)
  assert.equal(ogLineChipTextColor("unknown-line"), WHITE)
})
