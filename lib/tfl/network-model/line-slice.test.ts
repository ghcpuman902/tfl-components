import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { NetworkModelSnapshot } from "./from-gtfs"
import {
  classifySkipHop,
  formatDaysOfWeek,
  formatHeadway,
  isTimetableSkip,
  mergeSnapshotStations,
  sliceNetworkModel,
  snapshotMovementsForTopology,
  snapshotPassengerTopology,
  snapshotPathsBundle,
} from "./line-slice"

const snapshot: NetworkModelSnapshot = {
  lines: [
    {
      id: "bakerloo",
      shortName: "Bakerloo",
      longName: "Bakerloo",
      mode: "Underground",
      color: "#B26300",
      textColor: "#FFFFFF",
    },
    {
      id: "elizabeth",
      shortName: "Elizabeth line",
      longName: "Elizabeth line",
      mode: "Elizabeth line",
      color: "#60399E",
      textColor: "#FFFFFF",
    },
  ],
  stations: [
    { id: "A", name: "Elephant & Castle", lat: 51.49, lon: -0.1 },
    { id: "B", name: "Paddington", lat: 51.51, lon: -0.17 },
    { id: "C", name: "Harrow & Wealdstone", lat: 51.59, lon: -0.33 },
    { id: "L", name: "Liverpool Street", lat: 51.52, lon: -0.08 },
    { id: "910GPADTON", name: "London Paddington", lat: 51.5171, lon: -0.1773 },
    { id: "940GZZLUPAC", name: "Paddington", lat: 51.5166, lon: -0.1757 },
    { id: "910GMDNHEAD", name: "Maidenhead", lat: 51.518, lon: -0.723 },
    { id: "910GTAPLOW", name: "Taplow", lat: 51.523, lon: -0.682 },
    { id: "910GSLOUGH", name: "Slough", lat: 51.512, lon: -0.591 },
    { id: "910GEALING", name: "Ealing Broadway", lat: 51.515, lon: -0.301 },
    { id: "910GACTONML", name: "Acton Main Line", lat: 51.517, lon: -0.268 },
  ],
  hubs: [],
  patterns: [
    {
      id: "bakerloo/outbound/1",
      lineId: "bakerloo",
      direction: "outbound",
      callIds: ["A", "B", "C"],
    },
    {
      id: "elizabeth/outbound/1",
      lineId: "elizabeth",
      direction: "outbound",
      callIds: ["940GZZLUPAC", "L"],
    },
    {
      id: "elizabeth/outbound/allstop",
      lineId: "elizabeth",
      direction: "outbound",
      callIds: ["910GMDNHEAD", "910GTAPLOW", "910GSLOUGH", "910GPADTON"],
    },
    {
      id: "elizabeth/outbound/skip",
      lineId: "elizabeth",
      direction: "outbound",
      callIds: ["910GMDNHEAD", "910GSLOUGH", "940GZZLUPAC"],
    },
    {
      id: "elizabeth/outbound/inner-allstop",
      lineId: "elizabeth",
      direction: "outbound",
      callIds: ["910GEALING", "910GACTONML", "940GZZLUPAC"],
    },
    {
      id: "elizabeth/outbound/inner-fast",
      lineId: "elizabeth",
      direction: "outbound",
      callIds: ["910GEALING", "940GZZLUPAC"],
    },
  ],
  calls: [],
  calendars: [
    {
      patternId: "bakerloo/outbound/1",
      daysOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      validFrom: "2026-08-17",
    },
    {
      patternId: "elizabeth/outbound/1",
      daysOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      validFrom: "2026-08-17",
    },
    {
      patternId: "elizabeth/outbound/allstop",
      daysOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      validFrom: "2026-08-17",
    },
    {
      patternId: "elizabeth/outbound/skip",
      daysOfWeek: ["sunday"],
      validFrom: "2026-08-17",
    },
    {
      patternId: "elizabeth/outbound/inner-allstop",
      daysOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      validFrom: "2026-08-17",
    },
    {
      patternId: "elizabeth/outbound/inner-fast",
      daysOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      validFrom: "2026-08-17",
    },
  ],
  frequencies: [
    {
      patternId: "bakerloo/outbound/1",
      timeWindow: "weekday 07:00–09:30",
      headwaySeconds: 300,
    },
    {
      patternId: "elizabeth/outbound/inner-fast",
      timeWindow: "weekday 07:00–09:30",
      headwaySeconds: 180,
    },
  ],
  paths: [
    {
      id: "gtfs:XR-1",
      mode: "Elizabeth line",
      geometry: {
        type: "LineString",
        coordinates: [
          [-0.18, 51.52],
          [-0.08, 51.52],
        ],
      },
    },
  ],
  pathMatches: [
    {
      patternId: "elizabeth/outbound/1",
      pathId: "gtfs:XR-1",
      confidence: "exact",
    },
  ],
  movements: [
    {
      fromStationId: "A",
      viaStationId: "B",
      toStationId: "C",
      patternIds: ["bakerloo/outbound/1"],
    },
    {
      fromStationId: "910GEALING",
      viaStationId: "910GACTONML",
      toStationId: "910GPADTON",
      patternIds: ["elizabeth/outbound/allstop"],
    },
    {
      fromStationId: "910GEALING",
      viaStationId: "910GACTONML",
      toStationId: "940GZZLUPAC",
      patternIds: ["elizabeth/outbound/inner-allstop"],
    },
  ],
}

describe("network model line slice", () => {
  it("keeps one line and builds a passenger graph from its patterns", () => {
    const slice = sliceNetworkModel(snapshot, "bakerloo")
    assert.ok(slice)
    assert.equal(slice.patterns.length, 1)
    assert.equal(slice.stations.length, 3)
    assert.equal(slice.paths.length, 0)
    const topology = snapshotPassengerTopology(slice)
    assert.equal(topology.nodes.length, 3)
    assert.equal(topology.edges.length, 2)
    assert.equal(
      topology.nodes.filter((node) => node.kind === "terminus").length,
      2,
    )
  })

  it("exposes timetable shapes only for matched Elizabeth patterns", () => {
    const slice = sliceNetworkModel(snapshot, "elizabeth")
    assert.ok(slice)
    const bundle = snapshotPathsBundle(slice)
    assert.ok(bundle)
    assert.equal(bundle.lines.features.length, 1)
    assert.equal(bundle.lines.features[0]?.properties.lineId, "elizabeth")
  })

  it("merges London Paddington with Paddington and marks skip hops", () => {
    const slice = sliceNetworkModel(snapshot, "elizabeth")
    assert.ok(slice)
    const merged = mergeSnapshotStations(slice.stations)
    assert.equal(merged.canonicalId("910GPADTON"), merged.canonicalId("940GZZLUPAC"))
    const topology = snapshotPassengerTopology(slice)
    const names = topology.nodes.map((node) => node.stationName)
    assert.equal(names.filter((name) => /paddington/i.test(name ?? "")).length, 1)
    const skip = topology.edges.filter((edge) => isTimetableSkip(edge.service))
    const spine = topology.edges.filter((edge) => !isTimetableSkip(edge.service))
    assert.ok(skip.length >= 1)
    assert.ok(spine.length >= 2)
  })

  it("treats weekday skip-stop as regular fast and Sunday-only as occasional", () => {
    const slice = sliceNetworkModel(snapshot, "elizabeth")
    assert.ok(slice)
    const topology = snapshotPassengerTopology(slice)
    const nameOf = (nodeId: string) =>
      topology.nodes.find((node) => node.id === nodeId)?.stationName ?? ""
    const hop = (left: string, right: string) =>
      topology.edges.find((edge) => {
        const names = [nameOf(edge.from), nameOf(edge.to)].map((name) =>
          name.toLowerCase(),
        )
        return names.includes(left) && names.includes(right)
      })
    const sundaySkip = hop("maidenhead", "slough")
    const weekdayFast = hop("ealing broadway", "paddington")
    assert.equal(sundaySkip?.service, "occasional")
    assert.match(sundaySkip?.serviceNote ?? "", /weekend-only|Sun/)
    assert.equal(weekdayFast?.service, "fast")
    assert.match(weekdayFast?.serviceNote ?? "", /Regular scheduled skip/)
    assert.equal(
      classifySkipHop(
        [{ patternId: "p", daysOfWeek: ["sunday"], validFrom: "2026-01-01" }],
        [],
      ),
      "occasional",
    )
    assert.equal(
      classifySkipHop(
        [
          {
            patternId: "p",
            daysOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday"],
            validFrom: "2026-01-01",
          },
        ],
        [
          {
            patternId: "p",
            timeWindow: "weekday 07:00–09:30",
            headwaySeconds: 180,
          },
        ],
      ),
      "fast",
    )
    assert.equal(
      classifySkipHop(
        [
          {
            patternId: "p",
            daysOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday"],
            validFrom: "2026-01-01",
          },
        ],
        [
          {
            patternId: "p",
            timeWindow: "weekday 19:00–24:00",
            headwaySeconds: 810,
          },
        ],
      ),
      "occasional",
    )
  })

  it("collapses Paddington aliases into one directed movement", () => {
    const slice = sliceNetworkModel(snapshot, "elizabeth")
    assert.ok(slice)
    const topology = snapshotPassengerTopology(slice)
    const movements = snapshotMovementsForTopology(slice, topology)
    const ids = movements.map((movement) => movement.id)
    assert.equal(ids.length, new Set(ids).size)
    const collapsed = movements.find(
      (movement) =>
        movement.from.endsWith("910GEALING") &&
        movement.via.endsWith("910GACTONML"),
    )
    assert.ok(collapsed)
    assert.deepEqual(collapsed.patternIds, [
      "elizabeth/outbound/allstop",
      "elizabeth/outbound/inner-allstop",
    ])
  })

  it("formats day classes and headways", () => {
    assert.equal(
      formatDaysOfWeek(["monday", "tuesday", "wednesday", "thursday", "friday"]),
      "Mon–Fri",
    )
    assert.equal(formatHeadway(300), "5 min")
  })
})
