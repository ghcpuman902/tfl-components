import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { Feature, LineString } from "geojson"
import type { LineSegmentProperties } from "@/lib/tfl/geography-types"
import { contractTrackTopology } from "./contract-track-topology"
import type { LngLat, TrackStation } from "./transit-track-graph"

const feature = (
  id: string,
  coords: LngLat[]
): Feature<LineString, LineSegmentProperties> => ({
  type: "Feature",
  id,
  properties: {
    featureId: id,
    lineId: "test",
    lineName: "Test",
    color: "#000",
  },
  geometry: { type: "LineString", coordinates: coords },
})

const ORIGIN: LngLat = [-0.12, 51.5]
const north = (m: number): LngLat => [-0.12, 51.5 + m / 111_320]
const east = (m: number): LngLat => [-0.12 + m / 69_300, 51.5]

describe("contractTrackTopology", () => {
  it("splits a weld into a bonded junction pair when a station forks through doubled track", () => {
    // Two physical tracks share the "B" side of this weld (spine passes
    // through, branch starts there) and diverge to C and D respectively —
    // the same shape as the real Kennington / Euston / Camden Town welds.
    // `splitFlyingJunctions` keeps each track's own through-move on its own
    // node instead of fanning both onto one congested vertex.
    const spine = [
      ORIGIN,
      north(200),
      north(400),
      north(600),
      north(800),
      north(1000),
    ]
    const branch = [north(400), east(400), east(800)]
    const stations: TrackStation[] = [
      { id: "a", name: "A", label: "A", coordinates: ORIGIN },
      { id: "b", name: "B", label: "B", coordinates: north(400) },
      { id: "c", name: "C", label: "C", coordinates: north(1000) },
      { id: "d", name: "D", label: "D", coordinates: east(800) },
    ]
    const result = contractTrackTopology(
      [feature("spine", spine), feature("branch", branch)],
      stations
    )
    const stationsFound = result.nodes
      .filter((node) => node.kind === "station")
      .map((node) => node.stationName)
      .sort()
    assert.deepEqual(stationsFound, ["A", "B", "C", "D"])

    const junctions = result.nodes.filter((node) => node.kind === "junction")
    assert.equal(junctions.length, 2, "the weld splits into a bonded pair")
    for (const junction of junctions) {
      assert.ok(junction.id.startsWith("j:"))
      assert.notEqual(junction.id, "s:b")
      assert.ok(junction.splitFrom, "each half records the weld it split from")
    }
    assert.equal(junctions[0]!.splitFrom, junctions[1]!.splitFrom)

    const bond = result.edges.find((edge) => edge.kind === "bond")
    assert.ok(bond, "a bond edge links the two halves")
    assert.deepEqual(
      [bond!.from, bond!.to].sort(),
      junctions.map((junction) => junction.id).sort()
    )

    // Each half keeps only its own branch's two edges — no vertex fans out
    // to every leg.
    for (const junction of junctions) {
      const incident = result.edges.filter(
        (edge) =>
          (edge.from === junction.id || edge.to === junction.id) &&
          edge.kind !== "bond"
      )
      assert.equal(incident.length, 2)
      assert.ok(
        incident.every((edge) => edge.featureId === incident[0]!.featureId)
      )
    }
  })

  it("does not merge an offset weld into the nearby station", () => {
    const weld = north(480)
    const spine = [ORIGIN, north(200), weld, north(800), north(1000)]
    const branch = [weld, east(400), east(800)]
    const stations: TrackStation[] = [
      { id: "a", name: "A", label: "A", coordinates: ORIGIN },
      { id: "b", name: "B", label: "B", coordinates: north(400) },
      { id: "c", name: "C", label: "C", coordinates: north(1000) },
      { id: "d", name: "D", label: "D", coordinates: east(800) },
    ]
    const result = contractTrackTopology(
      [feature("spine", spine), feature("branch", branch)],
      stations
    )
    const junction = result.nodes.find((node) => node.kind === "junction")
    const stationB = result.nodes.find((node) => node.stationId === "b")
    assert.ok(junction)
    assert.ok(stationB)
    assert.notEqual(junction!.id, stationB!.id)
    assert.equal(junction!.nearStationName, "B")
  })
})
