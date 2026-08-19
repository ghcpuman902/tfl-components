import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { hashCanonical } from "@/lib/tfl/observatory/hash"
import {
  cataloguePayload,
  normaliseLines,
  normaliseRouteSequence,
  normaliseStops,
  routePayload,
  stopsPayload,
} from "@/lib/tfl/observatory/normalise"

describe("normaliseLines", () => {
  it("keeps observed rail modes and stable identities", () => {
    const { lines, dropped } = normaliseLines([
      {
        id: "victoria",
        name: "Victoria",
        modeName: "tube",
        serviceTypes: [{ name: "Regular" }],
      },
      { id: "94", name: "94", modeName: "bus" },
      { id: "Elizabeth", name: "Elizabeth line", modeName: "elizabeth-line" },
    ])

    assert.equal(dropped, 1)
    assert.deepEqual(
      lines.map((line) => line.id),
      ["elizabeth", "victoria"]
    )
    assert.equal(lines[0]?.modeName, "elizabeth-line")
  })

  it("ignores catalogue order when hashing", () => {
    const a = cataloguePayload(
      normaliseLines([
        { id: "central", name: "Central", modeName: "tube" },
        { id: "district", name: "District", modeName: "tube" },
      ]).lines
    )
    const b = cataloguePayload(
      normaliseLines([
        { id: "district", name: "District", modeName: "tube" },
        { id: "central", name: "Central", modeName: "tube" },
      ]).lines
    )
    assert.equal(hashCanonical(a), hashCanonical(b))
  })
})

describe("normaliseStops", () => {
  it("uses NaPTAN ids and ignores listing order", () => {
    const first = normaliseStops("district", [
      { naptanId: "940GZZLUEMB", commonName: "Embankment" },
      { id: "940GZZLUVIC", commonName: "Victoria" },
    ])
    const second = normaliseStops("district", [
      { id: "940GZZLUVIC", commonName: "Victoria" },
      { id: "940GZZLUEMB", name: "Embankment" },
    ])

    assert.equal(
      hashCanonical(stopsPayload("district", first.stops)),
      hashCanonical(stopsPayload("district", second.stops))
    )
    assert.equal(first.stops[0]?.id, "940GZZLUEMB")
  })

  it("drops stops without an identifier", () => {
    const { stops, dropped } = normaliseStops("district", [
      { commonName: "Nameless" },
      { id: "940GZZLUVIC", commonName: "Victoria" },
    ])
    assert.equal(dropped, 1)
    assert.equal(stops.length, 1)
  })
})

describe("normaliseRouteSequence", () => {
  it("preserves station order inside a branch and sorts branches stably", () => {
    const { route } = normaliseRouteSequence("northern", "outbound", {
      orderedLineRoutes: [
        { name: "Morden via Bank", naptanIds: ["A", "B", "C"] },
        { name: "Edgware via Bank", naptanIds: ["A", "D"] },
      ],
    })
    assert.deepEqual(
      route.branches.map((branch) => branch.name),
      ["Edgware via Bank", "Morden via Bank"]
    )
    assert.deepEqual(route.branches[1]?.naptanIds, ["A", "B", "C"])
  })

  it("falls back to stopPointSequences when ordered routes are empty", () => {
    const { route } = normaliseRouteSequence("rb1", "inbound", {
      orderedLineRoutes: [],
      stopPointSequences: [
        {
          stopPoint: [
            { id: "930GWFD", commonName: "Westminster Pier" },
            { naptanId: "930GGNB", commonName: "Greenwich Pier" },
          ],
        },
      ],
    })
    assert.deepEqual(route.branches[0]?.naptanIds, ["930GWFD", "930GGNB"])
  })

  it("ignores crowding-like fields and duplicate branches", () => {
    const first = routePayload(
      normaliseRouteSequence("victoria", "inbound", {
        lineStrings: ["noisy"],
        orderedLineRoutes: [
          { name: "Walthamstow", naptanIds: ["A", "B"] },
          { name: "Walthamstow", naptanIds: ["A", "B"] },
        ],
      }).route
    )
    const second = routePayload(
      normaliseRouteSequence("victoria", "inbound", {
        orderedLineRoutes: [{ name: "Walthamstow", naptanIds: ["A", "B"] }],
      }).route
    )
    assert.equal(hashCanonical(first), hashCanonical(second))
  })
})
