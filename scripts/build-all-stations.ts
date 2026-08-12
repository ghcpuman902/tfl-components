/**
 * Combine station geometry from per-mode GeoJSON bundles into a single
 * all-stations.json file. Stations that appear in multiple modes have their
 * lineIds merged.
 *
 * Usage: npx tsx scripts/build-all-stations.ts
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Feature, Point } from "geojson";
import type {
  StationProperties,
  TransitGeometryBundle,
  TransitMode,
} from "../lib/tfl/geography-types";

const MODES: TransitMode[] = ["tube", "elizabeth", "overground", "dlr", "tram"];
const DATA_DIR = join(import.meta.dirname, "..", "data", "geography");
const PUBLIC_DIR = join(
  import.meta.dirname,
  "..",
  "public",
  "data",
  "geography",
);

const stations = new Map<string, Feature<Point, StationProperties>>();

for (const mode of MODES) {
  const raw = readFileSync(join(DATA_DIR, `${mode}-geometry.json`), "utf-8");
  const bundle = JSON.parse(raw) as TransitGeometryBundle;

  for (const feature of bundle.stations.features) {
    const id = feature.id?.toString() ?? feature.properties.featureId;
    const existing = stations.get(id);

    if (existing) {
      const merged = new Set([
        ...existing.properties.lineIds,
        ...feature.properties.lineIds,
      ]);
      existing.properties.lineIds = [...merged];
    } else {
      stations.set(id, {
        type: "Feature",
        id,
        properties: { ...feature.properties },
        geometry: feature.geometry,
      });
    }
  }
}

const collection = {
  type: "FeatureCollection" as const,
  features: [...stations.values()].sort((a, b) =>
    a.properties.label.localeCompare(b.properties.label),
  ),
};

const json = JSON.stringify(collection);

writeFileSync(join(DATA_DIR, "all-stations.json"), json);
writeFileSync(join(PUBLIC_DIR, "all-stations.json"), json);

console.log(
  `Wrote ${collection.features.length} stations to data/geography/all-stations.json and public mirror.`,
);
