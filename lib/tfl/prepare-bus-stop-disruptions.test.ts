import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  prepareBusStopDisruptions,
  type RawBusStopDisruption,
} from "@/lib/tfl/prepare-bus-stop-disruptions"

describe("prepareBusStopDisruptions", () => {
  it("attaches a route-specific diversion to that route, even with zero live rows", () => {
    // Real shape from client.stopPoint.getDisruptionByMode(["bus"]) — Merton
    // Mansions, route 164 diverted away from this stop entirely.
    const disruptions: RawBusStopDisruption[] = [
      {
        description:
          "Route 164 is on diversion until\\n17:00 on Friday 21 August due to\\n gas works. tfl.gov.uk.\\n",
      },
    ]

    const result = prepareBusStopDisruptions(disruptions, [])

    assert.deepEqual(result, [
      {
        lineId: "164",
        description:
          "Route 164 is on diversion until 17:00 on Friday 21 August due to gas works. tfl.gov.uk.",
      },
    ])
  })

  it("fans a stop-wide closure out to every route currently in rows", () => {
    // Real shape — Capworth Street, stop closed with no route named; 58 and
    // 158 still show live predictions there despite the closure.
    const disruptions: RawBusStopDisruption[] = [
      { description: "Bus Stop Closed\\nuntil 17:00 Tuesday 18 August\\n\\n" },
    ]
    const rows = [{ lineName: "158" }, { lineName: "58" }, { lineName: "158" }]

    const result = prepareBusStopDisruptions(disruptions, rows)

    assert.deepEqual(
      result.map((d) => d.lineId).sort(),
      ["158", "58"]
    )
    assert.equal(
      result[0]?.description,
      "Bus Stop Closed until 17:00 Tuesday 18 August"
    )
  })

  it("prefers concernedLines over a text mention when both are present", () => {
    const disruptions: RawBusStopDisruption[] = [
      {
        description: "Route 73 is on diversion",
        concernedLines: [{ id: "73" }, { id: "n73" }],
      },
    ]

    const result = prepareBusStopDisruptions(disruptions, [])

    assert.deepEqual(
      result.map((d) => d.lineId).sort(),
      ["73", "n73"]
    )
  })

  it("keeps the first description when two disruptions name the same route", () => {
    const disruptions: RawBusStopDisruption[] = [
      { description: "Route 9 is on diversion due to roadworks" },
      { description: "Route 9 stop closed for resurfacing" },
    ]

    const result = prepareBusStopDisruptions(disruptions, [])

    assert.equal(result.length, 1)
    assert.equal(result[0]?.description, "Route 9 is on diversion due to roadworks")
  })

  it("drops disruptions with no usable description", () => {
    const result = prepareBusStopDisruptions([{ description: "" }], [
      { lineName: "158" },
    ])
    assert.deepEqual(result, [])
  })

  it("returns nothing for a stop-wide closure when there are no live rows to fan out to", () => {
    const result = prepareBusStopDisruptions(
      [{ description: "Bus Stop Closed" }],
      []
    )
    assert.deepEqual(result, [])
  })

  it("attaches an RB1 mention to that river line", () => {
    const result = prepareBusStopDisruptions(
      [
        {
          description:
            "RB1 is not calling at this pier until\\n21:00 on Friday 21 August. tfl.gov.uk.\\n",
        },
      ],
      [],
    )
    assert.deepEqual(result, [
      {
        lineId: "rb1",
        description:
          "RB1 is not calling at this pier until 21:00 on Friday 21 August. tfl.gov.uk.",
      },
    ])
  })

  it("canonicalises Woolwich Ferry mentions", () => {
    const result = prepareBusStopDisruptions(
      [{ description: "Woolwich Ferry is not running this evening" }],
      [],
    )
    assert.equal(result[0]?.lineId, "woolwich-ferry")
  })

  it("fans a pier-wide closure out to river routes in rows", () => {
    const result = prepareBusStopDisruptions(
      [{ description: "Pier Closed\\nuntil 17:00 Tuesday 18 August\\n\\n" }],
      [{ lineName: "RB1" }, { lineName: "RB6" }, { lineName: "RB1" }],
    )
    assert.deepEqual(
      result.map((d) => d.lineId).sort(),
      ["rb1", "rb6"],
    )
  })

  it("does not treat a bus route mention as a river line", () => {
    const result = prepareBusStopDisruptions(
      [{ description: "Route 164 is on diversion" }],
      [],
    )
    assert.deepEqual(result.map((d) => d.lineId), ["164"])
  })
})
