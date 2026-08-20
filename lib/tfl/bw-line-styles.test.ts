import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  CABLE,
  UG,
  monoLineHeightUnits,
  resolveMonoLineStyle,
  scaleMonoLayers,
} from "./bw-line-styles.ts"

describe("resolveMonoLineStyle", () => {
  it("maps TfL ids and aliases onto B&W keys", () => {
    assert.equal(resolveMonoLineStyle("hammersmith-city")[0]?.width, UG)
    assert.equal(resolveMonoLineStyle("waterloo-city").length > 1, true)
    assert.equal(resolveMonoLineStyle("london-cable-car")[0]?.width, CABLE)
    assert.equal(
      resolveMonoLineStyle("cable-car")[0]?.width,
      resolveMonoLineStyle("emirates-airline")[0]?.width
    )
    assert.equal(
      resolveMonoLineStyle("elizabeth-line")[0]?.stroke,
      "var(--tfl-mono-ink)"
    )
    assert.equal(resolveMonoLineStyle("unknown-line")[0]?.width, UG)
  })
})

describe("scaleMonoLayers", () => {
  it("maps UG 8 to diagram unit x and scales dashes", () => {
    const layers = scaleMonoLayers(
      [
        {
          width: UG,
          stroke: "var(--tfl-mono-ink)",
          dash: "4 2",
          dashoffset: 2,
        },
      ],
      10
    )
    assert.equal(layers[0]?.width, 10)
    assert.equal(layers[0]?.dash, "5 2.5")
    assert.equal(layers[0]?.dashoffset, 2.5)
    assert.equal(
      monoLineHeightUnits([{ width: CABLE, stroke: "x" }]),
      CABLE / UG
    )
  })
})
