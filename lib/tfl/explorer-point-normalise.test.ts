import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  isSmsCodeQuery,
  normaliseBikePoint,
  normaliseRailPoint,
  normaliseStopPoint,
} from "./explorer-point-normalise"

describe("isSmsCodeQuery", () => {
  it("accepts five digits", () => {
    assert.equal(isSmsCodeQuery("53240"), true)
    assert.equal(isSmsCodeQuery(" 53240 "), true)
  })

  it("rejects non-SMS queries", () => {
    assert.equal(isSmsCodeQuery("Trafalgar"), false)
    assert.equal(isSmsCodeQuery("4900"), false)
    assert.equal(isSmsCodeQuery("532401"), false)
  })
})

describe("normaliseStopPoint", () => {
  it("maps a bus stop", () => {
    const point = normaliseStopPoint({
      id: "490000091G",
      commonName: "Trafalgar Square",
      stopLetter: "g",
      lat: 51.508,
      lon: -0.128,
      modes: ["bus"],
      lines: [{ name: "9" }, { id: "24", name: "24" }],
      distance: 40,
      additionalProperties: [
        { key: "Towards", value: "Marble Arch" },
        { key: "SmsCode", value: "53240" },
        { key: "CompassPoint", value: "W" },
      ],
    })
    assert.deepEqual(point, {
      id: "490000091G",
      name: "Trafalgar Square",
      kind: "stopPoint",
      lat: 51.508,
      lon: -0.128,
      modes: ["bus"],
      lineIds: ["9", "24"],
      stopLetter: "G",
      smsCode: "53240",
      towards: "Marble Arch",
      distanceMeters: 40,
      compassPoint: "W",
      compassBearingDegrees: 270,
      additionalProperties: [
        { key: "Towards", value: "Marble Arch" },
        { key: "SmsCode", value: "53240" },
        { key: "CompassPoint", value: "W" },
      ],
    })
  })

  it("reads towards from a search hit and drops arrow letters", () => {
    const point = normaliseStopPoint({
      id: "490012020A",
      commonName: "St George's Town Hall / Shadwell Stn",
      stopLetter: "->W",
      towards: "Wapping",
      modes: ["bus"],
    })
    assert.equal(point?.towards, "Wapping")
    assert.equal(point?.stopLetter, undefined)
    assert.equal(point?.compassBearingDegrees, 270)
  })

  it("returns null without id", () => {
    assert.equal(normaliseStopPoint({ commonName: "Nowhere" }), null)
  })
})

describe("normaliseBikePoint", () => {
  it("maps a dock", () => {
    const point = normaliseBikePoint({
      id: "BikePoints_1",
      name: "River Street, Clerkenwell",
      lat: 51.53,
      lon: -0.11,
      bikes: 5,
      eBikes: 1,
      spaces: 10,
      distance: 120,
    })
    assert.equal(point?.kind, "bikePoint")
    assert.equal(point?.bikes, 5)
    assert.equal(point?.distanceMeters, 120)
  })
})

describe("normaliseRailPoint", () => {
  it("maps a catalog station", () => {
    const point = normaliseRailPoint({
      id: "940GZZLUVIC",
      name: "Victoria Underground Station",
      displayName: "Victoria",
      modes: ["tube"],
      lines: ["victoria", "circle"],
      zone: "1",
      lat: 51.496,
      lon: -0.144,
      aliasIds: ["940GZZLUVIC"],
    })
    assert.equal(point.name, "Victoria")
    assert.equal(point.zone, "1")
    assert.deepEqual(point.lineIds, ["victoria", "circle"])
  })
})
