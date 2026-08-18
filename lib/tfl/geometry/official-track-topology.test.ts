import assert from "node:assert/strict";
import { describe, it } from "node:test";
import elizabeth from "@/data/geography/unique-track/elizabeth/full.json";
import { officialTrackTopology } from "./official-track-topology";
import type { LngLat, TrackStation } from "./transit-track-graph";

const stationsFromElizabeth = (): TrackStation[] =>
  (elizabeth.stations.features ?? []).flatMap((feature) => {
    if (feature.geometry?.type !== "Point") return [];
    const coords = feature.geometry.coordinates;
    if (coords.length < 2) return [];
    return [
      {
        id: String(feature.id ?? feature.properties.featureId),
        name: feature.properties.name,
        label: feature.properties.label,
        coordinates: [coords[0]!, coords[1]!] as LngLat,
      },
    ];
  });

const neighbors = (
  topology: NonNullable<ReturnType<typeof officialTrackTopology>>,
  name: string,
) => {
  const node = topology.nodes.find((item) => item.stationName === name);
  assert.ok(node, `missing ${name}`);
  const names = topology.edges.flatMap((edge) => {
    if (edge.from === node.id) {
      return [
        topology.nodes.find((item) => item.id === edge.to)?.stationName ?? "",
      ];
    }
    if (edge.to === node.id) {
      return [
        topology.nodes.find((item) => item.id === edge.from)?.stationName ?? "",
      ];
    }
    return [];
  });
  return names.sort();
};

describe("officialTrackTopology", () => {
  it("uses TfL sequences for Elizabeth hops", () => {
    const topology = officialTrackTopology("elizabeth", stationsFromElizabeth());
    assert.ok(topology);
    const names = new Set(topology.nodes.map((node) => node.stationName));
    for (const name of [
      "Twyford",
      "Slough",
      "Paddington",
      "Whitechapel",
      "Canary Wharf",
      "Custom House",
    ]) {
      assert.ok(names.has(name), `missing ${name}`);
    }
    assert.deepEqual(neighbors(topology, "Woolwich"), [
      "Abbey Wood",
      "Custom House",
    ]);
    assert.deepEqual(neighbors(topology, "Reading"), ["Twyford"]);
    assert.ok(neighbors(topology, "Whitechapel").includes("Canary Wharf"));
    assert.ok(neighbors(topology, "Whitechapel").includes("Stratford"));
    assert.equal(topology.nodes.filter((node) => node.kind === "junction").length, 0);
  });
});
