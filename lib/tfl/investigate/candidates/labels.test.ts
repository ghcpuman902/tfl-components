import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { boundaryLabels } from "./labels.ts"

describe("boundary labels", () => {
  it("keeps the two Paddingtons distinct", () => {
    const labels = boundaryLabels([
      { id: "940GZZLUBST", name: "Baker Street Underground Station" },
      { id: "940GZZLUPAC", name: "Paddington Underground Station" },
      { id: "940GZZLUPAH", name: "Paddington (H&C Line)-Underground" },
    ])
    assert.equal(labels.get("940GZZLUBST"), "Baker Street")
    assert.equal(labels.get("940GZZLUPAH"), "Paddington (H&C)")
    assert.notEqual(labels.get("940GZZLUPAC"), labels.get("940GZZLUPAH"))
  })
})
