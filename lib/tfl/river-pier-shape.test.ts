import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { isFerryPortStop, mapFerryPort } from "./river-pier-shape"

describe("isFerryPortStop", () => {
  it("keeps NaptanFerryPort and 930G ids", () => {
    assert.equal(
      isFerryPortStop({ id: "930GWMR", stopType: "NaptanFerryPort" }),
      true
    )
    assert.equal(isFerryPortStop({ id: "930GWMR" }), true)
  })

  it("drops berths", () => {
    assert.equal(
      isFerryPortStop({ id: "9300WMR", stopType: "NaptanFerryBerth" }),
      false
    )
  })
})

describe("mapFerryPort", () => {
  it("keeps river-bus lines and drops mixed bus routes", () => {
    const mapped = mapFerryPort({
      id: "930GPUT",
      commonName: "Putney Pier",
      stopType: "NaptanFerryPort",
      lines: [{ id: "rb6" }, { id: "22" }, { id: "n22" }],
    })
    assert.deepEqual(mapped?.lines, ["rb6"])
  })

  it("returns null for a berth", () => {
    assert.equal(
      mapFerryPort({
        id: "9300WMR",
        name: "Westminster Pier Berth",
        stopType: "NaptanFerryBerth",
      }),
      null
    )
  })
})
