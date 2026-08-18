import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  edgeLengthsFromHopTimes,
  hopsFromTimetable,
  minutesForHop,
  undirectedHopKey,
} from "./line-hop-times"

describe("line hop times", () => {
  it("turns timetable intervals into consecutive hop minutes", () => {
    const hops = hopsFromTimetable({
      timetable: {
        departureStopId: "A",
        routes: [
          {
            stationIntervals: [
              {
                intervals: [
                  { stopId: "B", timeToArrival: 2 },
                  { stopId: "C", timeToArrival: 5 },
                  { stopId: "D", timeToArrival: 6 },
                ],
              },
            ],
          },
        ],
      },
    })
    assert.equal(hops[undirectedHopKey("A", "B")], 2)
    assert.equal(hops[undirectedHopKey("B", "C")], 3)
    assert.equal(hops[undirectedHopKey("C", "D")], 1)
  })

  it("looks up hops after station-id aliases and s: prefixes", () => {
    const hops = { [undirectedHopKey("940GZZLUPAC", "910GEALING")]: 7 }
    const canonical = (id: string) =>
      id === "910GPADTON" ? "940GZZLUPAC" : id
    assert.equal(
      minutesForHop(hops, "s:910GPADTON", "s:910GEALING", canonical),
      7
    )
  })

  it("fills missing edges with the median known hop", () => {
    const lengths = edgeLengthsFromHopTimes(
      [
        { from: "a", to: "b" },
        { from: "b", to: "c" },
        { from: "c", to: "d" },
      ],
      new Map([
        ["a", "A"],
        ["b", "B"],
        ["c", "C"],
        ["d", "D"],
      ]),
      {
        [undirectedHopKey("A", "B")]: 2,
        [undirectedHopKey("B", "C")]: 4,
      }
    )
    assert.equal(lengths[0]?.length, 2)
    assert.equal(lengths[1]?.length, 4)
    assert.equal(lengths[2]?.length, 3)
  })
})
