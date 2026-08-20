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
})
