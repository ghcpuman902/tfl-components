import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  busSearchNameMatches,
  isBoardableBusStopId,
  isBusStop,
  isBusStopAreaId,
  mapStopPoint,
  mapStopsFromGeoResponse,
  parseBusStopSearchQuery,
  pickNamedExpandableMatches,
  preferStopsMatchingSearch,
  rankStopsBySearchLetter,
  readCompassBearingDegrees,
  readCompassPoint,
  readStopLetter,
  resolveBusNameSearchHits,
} from "./bus-stop-shape"

describe("readStopLetter", () => {
  it("prefers stopLetter", () => {
    assert.equal(readStopLetter("g", "Stop R"), "G")
  })

  it("falls back to short indicator", () => {
    assert.equal(readStopLetter(undefined, "Stop R"), "R")
  })

  it("ignores long indicators", () => {
    assert.equal(readStopLetter(undefined, "Stand 12"), undefined)
  })

  it("drops compass arrows instead of slicing to ->", () => {
    assert.equal(readStopLetter("->W", "->W"), undefined)
  })
})

describe("readCompassPoint", () => {
  it("reads CompassPoint from a leftover bag", () => {
    assert.equal(readCompassPoint([{ key: "CompassPoint", value: "NE" }]), "NE")
  })
})

describe("readCompassBearingDegrees", () => {
  it("prefers CompassPoint over an arrow indicator", () => {
    assert.equal(
      readCompassBearingDegrees(
        [{ key: "CompassPoint", value: "S" }],
        "->W",
        "->W"
      ),
      180
    )
  })

  it("falls back to a compass indicator", () => {
    assert.equal(readCompassBearingDegrees(undefined, "->E"), 90)
  })

  it("does not treat a painted stop letter as compass", () => {
    assert.equal(readCompassBearingDegrees(undefined, "W", "W"), undefined)
  })
})

describe("isBoardableBusStopId", () => {
  it("accepts 490… boarding ids, not 490G hubs", () => {
    assert.equal(isBoardableBusStopId("490000091G"), true)
    assert.equal(isBoardableBusStopId("HUBLBG"), false)
    assert.equal(isBoardableBusStopId("490G00014016"), false)
  })
})

describe("isBusStopAreaId", () => {
  it("matches NaPTAN stop-area ids", () => {
    assert.equal(isBusStopAreaId("490G000803"), true)
    assert.equal(isBusStopAreaId("490013766E"), false)
  })
})

describe("busSearchNameMatches", () => {
  it("matches a distinctive street token, not the word road", () => {
    assert.equal(
      busSearchNameMatches("Silverthorne Road", "Silverthorne Road"),
      true
    )
    assert.equal(
      busSearchNameMatches("Prairie Street", "Silverthorne Road"),
      false
    )
  })

  it("does not treat circus as a distinctive token", () => {
    assert.equal(
      busSearchNameMatches("St George's Circus", "Silverthorne Road"),
      false
    )
    assert.equal(
      busSearchNameMatches("St George's Circus", "St George's Circus"),
      true
    )
  })

  it("matches Trafalgar Square for the abbreviation Sq", () => {
    assert.equal(busSearchNameMatches("Trafalgar Square", "Trafalgar Sq"), true)
    assert.equal(
      busSearchNameMatches(
        "Charing Cross Stn / Trafalgar Square",
        "Trafalgar Sq"
      ),
      true
    )
  })
})

describe("pickNamedExpandableMatches", () => {
  it("keeps every name-matching hub, not only the first", () => {
    const picked = pickNamedExpandableMatches(
      [
        { name: "Silverthorne Road", lat: 51.47, lon: -0.148 },
        { name: "Silverthorne Road", lat: 51.46, lon: -0.145 },
        { name: "Prairie Street", lat: 51.47, lon: -0.147 },
      ],
      "Silverthorne Road"
    )
    assert.equal(picked.length, 2)
    assert.equal(picked[0]?.lon, -0.148)
    assert.equal(picked[1]?.lon, -0.145)
  })

  it("skips boardable 490 stops so mixed TfL hits still expand hubs", () => {
    const picked = pickNamedExpandableMatches(
      [
        {
          id: "490013766E",
          name: "Charing Cross Stn / Trafalgar Square",
          lat: 51.508,
          lon: -0.126,
        },
        {
          id: "490013766F",
          name: "Charing Cross Stn / Trafalgar Square",
          lat: 51.508,
          lon: -0.126,
        },
        {
          id: "490G000803",
          name: "Trafalgar Square / Charing Cross Stn",
          lat: 51.509,
          lon: -0.126,
        },
        {
          id: "490G000804",
          name: "Northumberland Avenue / Trafalgar Square",
          lat: 51.508,
          lon: -0.13,
        },
        {
          id: "490G000832",
          name: "Whitehall / Trafalgar Square",
          lat: 51.506,
          lon: -0.127,
        },
      ],
      "Trafalgar Sq"
    )
    assert.deepEqual(
      picked.map((match) => match.id),
      ["490G000803", "490G000804", "490G000832"]
    )
  })
})

describe("preferStopsMatchingSearch", () => {
  it("drops nearby streets when any stop name matches", () => {
    const preferred = preferStopsMatchingSearch(
      [
        { id: "a", name: "Silverthorne Road" },
        { id: "b", name: "Prairie Street" },
        { id: "c", name: "Silverthorne Road" },
      ],
      "Silverthorne Road"
    )
    assert.deepEqual(
      preferred.map((stop) => stop.id),
      ["a", "c"]
    )
  })
})

describe("parseBusStopSearchQuery", () => {
  it("strips a Google (Stop Y) suffix and keeps the letter", () => {
    assert.deepEqual(parseBusStopSearchQuery("Rookery Road (Stop Y)"), {
      query: "Rookery Road",
      stopLetter: "Y",
    })
    assert.deepEqual(parseBusStopSearchQuery("Rookery Road (Y)"), {
      query: "Rookery Road",
      stopLetter: "Y",
    })
    assert.deepEqual(parseBusStopSearchQuery("Rookery Road Stop Y"), {
      query: "Rookery Road",
      stopLetter: "Y",
    })
  })

  it("leaves a plain street query unchanged", () => {
    assert.deepEqual(parseBusStopSearchQuery("Silverthorne Road"), {
      query: "Silverthorne Road",
    })
  })
})

describe("rankStopsBySearchLetter", () => {
  it("pins the matching letter first and keeps the other stops", () => {
    const ranked = rankStopsBySearchLetter(
      [
        { id: "n", stopLetter: "N" },
        { id: "y", stopLetter: "Y" },
      ],
      "Y"
    )
    assert.deepEqual(
      ranked.map((stop) => stop.id),
      ["y", "n"]
    )
  })
})

describe("resolveBusNameSearchHits", () => {
  it("unions featured Trafalgar stops with hub expansion, not only two boarding hits", () => {
    const result = resolveBusNameSearchHits(
      [
        {
          id: "490013766E",
          name: "Charing Cross Stn / Trafalgar Square",
          stopLetter: "E",
        },
        {
          id: "490013766F",
          name: "Charing Cross Stn / Trafalgar Square",
          stopLetter: "F",
        },
      ],
      [
        [
          {
            id: "490000091A",
            name: "Whitehall / Trafalgar Square",
            stopLetter: "A",
          },
          {
            id: "490000091G",
            name: "Trafalgar Square",
            stopLetter: "G",
          },
        ],
      ],
      "Trafalgar Sq",
      undefined,
      [
        {
          id: "490013767C",
          name: "Trafalgar Sq / Charing Cross Stn",
          stopLetter: "C",
        },
        {
          id: "490013766E",
          name: "Charing Cross Stn / Trafalgar Square",
          stopLetter: "E",
        },
      ]
    )
    assert.deepEqual(
      result.map((stop) => stop.id),
      ["490013767C", "490013766E", "490013766F", "490000091A", "490000091G"]
    )
  })
})

describe("isBusStop", () => {
  it("checks modes array", () => {
    assert.equal(isBusStop(["bus"]), true)
    assert.equal(isBusStop(["tube"]), false)
    assert.equal(isBusStop(undefined), false)
  })
})

describe("mapStopPoint", () => {
  it("maps a full stop", () => {
    const mapped = mapStopPoint({
      id: "490000091G",
      commonName: "Trafalgar Square",
      stopLetter: "G",
      distance: 42,
      lat: 51.508,
      lon: -0.128,
      lines: [{ name: "9" }, { name: "24" }],
      additionalProperties: [
        { key: "Towards", value: "Marble Arch" },
        { key: "SmsCode", value: "53240" },
        { key: "CompassPoint", value: "NE" },
      ],
    })
    assert.deepEqual(mapped, {
      id: "490000091G",
      name: "Trafalgar Square",
      indicator: undefined,
      stopLetter: "G",
      towards: "Marble Arch",
      distance: 42,
      lines: ["9", "24"],
      lat: 51.508,
      lon: -0.128,
      smsCode: "53240",
      compassPoint: "NE",
      compassBearingDegrees: 45,
      additionalProperties: [
        { key: "Towards", value: "Marble Arch" },
        { key: "SmsCode", value: "53240" },
        { key: "CompassPoint", value: "NE" },
      ],
    })
  })

  it("reads towards from a search hit field", () => {
    const mapped = mapStopPoint({
      id: "490000251E",
      commonName: "Wapping Station",
      towards: "Limehouse",
    })
    assert.equal(mapped?.towards, "Limehouse")
  })

  it("reads bearing from a compass indicator when there is no letter", () => {
    const mapped = mapStopPoint({
      id: "490012020A",
      commonName: "The Highway",
      stopLetter: "->W",
      indicator: "->W",
    })
    assert.equal(mapped?.stopLetter, undefined)
    assert.equal(mapped?.compassBearingDegrees, 270)
  })

  it("returns null without id", () => {
    assert.equal(mapStopPoint({ commonName: "Nowhere" }), null)
  })
})

describe("mapStopsFromGeoResponse", () => {
  it("filters, sorts, and limits", () => {
    const result = mapStopsFromGeoResponse(
      [
        {
          id: "490000002",
          commonName: "Far",
          distance: 300,
          modes: ["bus"],
        },
        {
          id: "HUBLBG",
          commonName: "Hub",
          distance: 10,
          modes: ["bus"],
        },
        {
          id: "490000001",
          commonName: "Near",
          distance: 50,
          modes: ["bus"],
        },
        {
          id: "940GZZLU",
          commonName: "Tube",
          distance: 20,
          modes: ["tube"],
        },
      ],
      1
    )
    assert.equal(result.length, 1)
    assert.equal(result[0]?.id, "490000001")
  })
})
