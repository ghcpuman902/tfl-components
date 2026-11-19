import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { stopsFromRiverOrderedRoutes } from "./river-route"

describe("stopsFromRiverOrderedRoutes", () => {
  it("uses the longest ordered route instead of flattened branches", () => {
    const stops = stopsFromRiverOrderedRoutes({
      mode: "river-bus",
      orderedLineRoutes: [
        { naptanIds: ["930GAWT", "930GWRC"] },
        { naptanIds: ["930GBWR", "930GWMR", "930GEMT", "930GGPS"] },
      ],
      stations: [
        { id: "930GBWR", name: "Battersea Power Station Pier" },
        { id: "930GWMR", name: "Westminster Pier" },
        { id: "930GEMT", name: "Embankment Pier" },
        { id: "930GGPS", name: "Greenland (Surrey Quays) Pier" },
      ],
      stopPointSequences: [
        {
          stopPoint: [
            { id: "930GAWT", name: "Woolwich (Royal Arsenal) Pier" },
            { id: "930GWRC", name: "Woolwich Church Street Pier" },
          ],
        },
      ],
    })
    assert.deepEqual(stops, [
      { id: "930GBWR", name: "Battersea Power Station Pier" },
      { id: "930GWMR", name: "Westminster Pier" },
      { id: "930GEMT", name: "Embankment Pier" },
      { id: "930GGPS", name: "Greenland (Surrey Quays) Pier" },
    ])
  })

  it("returns null for non-river sequences", () => {
    assert.equal(
      stopsFromRiverOrderedRoutes({
        mode: "bus",
        orderedLineRoutes: [{ naptanIds: ["490000091G"] }],
      }),
      null
    )
  })

  it("breaks a tie between equally long routes the same way whatever TfL's order", () => {
    const viaBlackfriars = {
      name: "Putney  &harr;  Barking Riverside  via Blackfriars ",
      naptanIds: ["930GPUT", "930GBFR", "930GBRVS"],
    }
    const viaChelsea = {
      name: "Putney  &harr;  Barking Riverside  via Chelsea Harbour ",
      naptanIds: ["930GPUT", "930GCHP", "930GBRVS"],
    }
    const pick = (orderedLineRoutes: (typeof viaBlackfriars)[]) =>
      stopsFromRiverOrderedRoutes({ mode: "river-bus", orderedLineRoutes })?.map(
        (stop) => stop.id
      )
    assert.deepEqual(pick([viaBlackfriars, viaChelsea]), viaBlackfriars.naptanIds)
    assert.deepEqual(pick([viaChelsea, viaBlackfriars]), viaBlackfriars.naptanIds)
  })

  it("equal length and name: the ids decide", () => {
    const a = { naptanIds: ["930GA", "930GB"] }
    const b = { naptanIds: ["930GA", "930GC"] }
    const pick = (orderedLineRoutes: (typeof a)[]) =>
      stopsFromRiverOrderedRoutes({ mode: "river-bus", orderedLineRoutes })?.[1]?.id
    assert.equal(pick([a, b]), "930GB")
    assert.equal(pick([b, a]), "930GB")
  })

  it("a longer route still wins over a tie-break", () => {
    const stops = stopsFromRiverOrderedRoutes({
      mode: "river-bus",
      orderedLineRoutes: [
        { name: "A", naptanIds: ["930GA", "930GB"] },
        { name: "Z", naptanIds: ["930GA", "930GB", "930GC"] },
      ],
    })
    assert.equal(stops?.length, 3)
  })
})
