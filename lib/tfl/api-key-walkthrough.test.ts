import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { TFL_API_KEY_WALKTHROUGH } from "./api-key-walkthrough"
import { TFL_API_PORTAL_PRODUCT_URL } from "./api-portal"

describe("TfL API key walkthrough", () => {
  it("covers signup through copying a key", () => {
    assert.equal(TFL_API_KEY_WALKTHROUGH.length, 7)
    assert.deepEqual(
      TFL_API_KEY_WALKTHROUGH.map((step) => step.id),
      [
        "a-signup",
        "b-verify-email",
        "c-signin",
        "d-open-products",
        "e-select-500",
        "f-subscribe",
        "g-copy-key",
      ]
    )
  })

  it("sends the subscribe step to the 500 Requests product", () => {
    assert.match(TFL_API_PORTAL_PRODUCT_URL, /product#product=2357355709892/)
    const productSteps = TFL_API_KEY_WALKTHROUGH.filter(
      (step) => step.href === TFL_API_PORTAL_PRODUCT_URL
    )
    assert.deepEqual(
      productSteps.map((step) => step.id),
      ["f-subscribe"]
    )
  })
})
