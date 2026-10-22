import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  CUSTOMISE_SPLIT,
  parseCustomiseParam,
  parseCustomiseStored,
  resolveCustomiseVariant,
  variantFromSplit,
} from "./board-customise-variant"

const split = { version: "s1", weights: { panel: 1, c: 1, d: 1, r: 1 } }
const never = () => {
  throw new Error("rolled")
}

describe("customise variant assignment", () => {
  it("ships with the split OFF: everyone gets the current panel", () => {
    assert.equal(CUSTOMISE_SPLIT, null)
    const result = resolveCustomiseVariant({
      param: null,
      stored: {},
      roll: never,
    })
    assert.deepEqual(result, {
      variant: "panel",
      source: "default",
      stored: {},
    })
  })

  it("the URL param wins and is remembered", () => {
    const result = resolveCustomiseVariant({
      param: "r",
      stored: { assigned: { variant: "c", split: "s1" } },
      split,
      roll: never,
    })
    assert.equal(result.variant, "r")
    assert.equal(result.source, "param")
    assert.equal(result.stored.override, "r")
    const later = resolveCustomiseVariant({
      param: null,
      stored: result.stored,
      split,
      roll: never,
    })
    assert.equal(later.variant, "r")
    assert.equal(later.source, "override")
  })

  it("?customise=panel clears the override", () => {
    const result = resolveCustomiseVariant({
      param: "panel",
      stored: { override: "d" },
      roll: never,
    })
    assert.equal(result.variant, "panel")
    assert.equal(result.stored.override, undefined)
  })

  it("a split assignment is sticky per visitor and per split version", () => {
    const first = resolveCustomiseVariant({
      param: null,
      stored: {},
      split,
      roll: () => 0.6,
    })
    assert.equal(first.variant, "d")
    assert.equal(first.source, "assigned")
    const again = resolveCustomiseVariant({
      param: null,
      stored: first.stored,
      split,
      roll: never,
    })
    assert.equal(again.variant, "d")
    const next = resolveCustomiseVariant({
      param: null,
      stored: first.stored,
      split: { ...split, version: "s2" },
      roll: () => 0.1,
    })
    assert.equal(next.variant, "panel")
  })

  it("parses params and storage defensively", () => {
    assert.equal(parseCustomiseParam("C"), "c")
    assert.equal(parseCustomiseParam("default"), "clear")
    assert.equal(parseCustomiseParam("zzz"), null)
    assert.deepEqual(
      parseCustomiseStored({ override: "x", assigned: { variant: "r" } }),
      {}
    )
    assert.deepEqual(parseCustomiseStored({ override: "c" }), { override: "c" })
    assert.equal(variantFromSplit({ version: "x", weights: {} }, 0.5), "panel")
    assert.equal(
      variantFromSplit({ version: "x", weights: { r: 1 } }, 0.99),
      "r"
    )
  })
})
