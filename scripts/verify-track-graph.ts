#!/usr/bin/env tsx
/**
 * Invariants for unique-track centreline + graph snapshots.
 *
 * - Victoria centreline is exactly one feature
 * - No centreline feature shorter than MIN_RUN_M
 * - Every non-terminus endpoint is bit-identical to a vertex on another
 *   feature of the same line
 * - Each line's graph is one connected component
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  TRACK_GRAPH,
  connectedComponentCount,
  lineLengthMetres,
  pointKey,
  type LngLat,
} from "../lib/tfl/geometry/transit-track-graph.ts";
import type {
  TransitGeometryBundle,
  TransitGraph,
} from "../lib/tfl/geography-types.ts";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const UNIQUE_ROOT = path.join(ROOT, "data/geography/unique-track");
const MODES = ["tube", "overground", "elizabeth", "dlr", "tram"] as const;

const failures: string[] = [];

const fail = (message: string) => {
  failures.push(message);
};

const featuresForLine = (
  bundle: TransitGeometryBundle,
  lineId: string,
) =>
  (bundle.lines.features ?? []).filter(
    (feature) => feature.properties.lineId === lineId,
  );

for (const mode of MODES) {
  const centre = JSON.parse(
    await readFile(path.join(UNIQUE_ROOT, mode, "full.json"), "utf8"),
  ) as TransitGeometryBundle;
  const graph = JSON.parse(
    await readFile(path.join(UNIQUE_ROOT, mode, "graph.json"), "utf8"),
  ) as TransitGraph;

  if (mode === "tube") {
    const victoria = featuresForLine(centre, "victoria");
    if (victoria.length !== 1) {
      fail(`victoria centreline should be 1 feature, got ${victoria.length}`);
    }
  }

  const lineIds = new Set(
    (centre.lines.features ?? []).map((feature) => feature.properties.lineId),
  );

  for (const lineId of lineIds) {
    const features = featuresForLine(centre, lineId);
    for (const feature of features) {
      const coords = feature.geometry.coordinates as LngLat[];
      const length = lineLengthMetres(coords);
      if (length < TRACK_GRAPH.MIN_RUN_M) {
        fail(
          `${feature.properties.featureId}: ${length.toFixed(1)} m < MIN_RUN_M`,
        );
      }
    }

    for (const feature of features) {
      const coords = feature.geometry.coordinates as LngLat[];
      const ends = [coords[0]!, coords[coords.length - 1]!];
      for (const end of ends) {
        const key = pointKey(end);
        const matches = features.flatMap((other) => {
          if (other.properties.featureId === feature.properties.featureId) {
            return [];
          }
          return (other.geometry.coordinates as LngLat[]).filter(
            (point) => pointKey(point) === key,
          );
        });
        if (matches.length === 0) continue;
        const bitIdentical = matches.some(
          (point) => point[0] === end[0] && point[1] === end[1],
        );
        if (!bitIdentical) {
          fail(
            `${feature.properties.featureId}: endpoint ${key} is not bit-identical on the paired feature`,
          );
        }
      }
    }

    const lineGraph: TransitGraph = {
      nodes: graph.nodes.filter((node) => node.lineId === lineId),
      edges: graph.edges.filter((edge) => edge.lineId === lineId),
    };
    if (lineGraph.nodes.length === 0) {
      fail(`${lineId}: graph has no nodes`);
      continue;
    }
    const components = connectedComponentCount(lineGraph);
    if (components !== 1) {
      fail(`${lineId}: expected 1 connected component, got ${components}`);
    }
  }
}

if (failures.length > 0) {
  console.error("Track graph verification failed:");
  for (const line of failures) console.error(`  - ${line}`);
  process.exit(1);
}

console.log("Track graph verification passed.");
