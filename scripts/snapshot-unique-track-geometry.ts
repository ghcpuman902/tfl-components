/**
 * Build unique-track geometry for map rendering.
 *
 * Reads full OSM route-variant bundles from `data/geography/{mode}-geometry.json`
 * and writes:
 *   - `data/geography/unique-track/{mode}/{full,preview,dual-full,dual-preview,graph}.json`
 *   - `public/data/geography/{mode}-geometry.json` (centreline full)
 *   - `public/data/geography/{mode}-geometry-dual.json`
 *   - `public/data/geography/{mode}-graph.json`
 *   - `data/geography/unique-track/manifest.json`
 *
 *   pnpm geography:unique-track
 *   pnpm geography:unique-track -- --report
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildModeTracks } from "../lib/tfl/geometry/transit-track-graph.ts";
import type { TransitGeometryBundle } from "../lib/tfl/geography-types.ts";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA_ROOT = path.join(ROOT, "data/geography");
const UNIQUE_ROOT = path.join(DATA_ROOT, "unique-track");
const PUBLIC_ROOT = path.join(ROOT, "public/data/geography");
const MODES = ["tube", "overground", "elizabeth", "dlr", "tram"] as const;
const REPORT = process.argv.includes("--report");

const snapshotMode = async (mode: (typeof MODES)[number]) => {
  const sourcePath = path.join(DATA_ROOT, `${mode}-geometry.json`);
  const raw = JSON.parse(
    await readFile(sourcePath, "utf8"),
  ) as TransitGeometryBundle;
  const built = buildModeTracks(raw);

  const outDir = path.join(UNIQUE_ROOT, mode);
  await mkdir(outDir, { recursive: true });
  await mkdir(PUBLIC_ROOT, { recursive: true });

  const centreFullJson = JSON.stringify(built.centrelineFull);
  const centrePreviewJson = JSON.stringify(built.centrelinePreview);
  const dualFullJson = JSON.stringify(built.dualFull);
  const dualPreviewJson = JSON.stringify(built.dualPreview);
  const graphJson = `${JSON.stringify(built.graph)}\n`;

  await writeFile(path.join(outDir, "full.json"), centreFullJson);
  await writeFile(path.join(outDir, "preview.json"), centrePreviewJson);
  await writeFile(path.join(outDir, "dual-full.json"), dualFullJson);
  await writeFile(path.join(outDir, "dual-preview.json"), dualPreviewJson);
  await writeFile(path.join(outDir, "graph.json"), graphJson);

  await writeFile(path.join(PUBLIC_ROOT, `${mode}-geometry.json`), centreFullJson);
  await writeFile(
    path.join(PUBLIC_ROOT, `${mode}-geometry-dual.json`),
    dualFullJson,
  );
  await writeFile(path.join(PUBLIC_ROOT, `${mode}-graph.json`), graphJson);

  if (REPORT) {
    console.log(`\n${mode}`);
    for (const report of built.reports) {
      const ends = report.centrelineEnds
        .map((pair) => `${pair.start} → ${pair.end}`)
        .join("; ");
      console.log(
        `  ${report.lineId.padEnd(18)} variants ${String(report.variantCount).padStart(3)}  dirs ${report.directionCounts[0]}/${report.directionCounts[1]}  centre ${report.centrelineCount}  dual ${report.dualCount}  ${ends}`,
      );
    }
  }

  return {
    mode,
    source: path.relative(ROOT, sourcePath),
    stations: built.centrelineFull.stations?.features?.length ?? 0,
    variantLines: raw.lines?.features?.length ?? 0,
    fullLines: built.centrelineFull.lines.features.length,
    previewLines: built.centrelinePreview.lines.features.length,
    dualFullLines: built.dualFull.lines.features.length,
    dualPreviewLines: built.dualPreview.lines.features.length,
    graphNodes: built.graph.nodes.length,
    graphEdges: built.graph.edges.length,
    fullBytes: Buffer.byteLength(centreFullJson),
    previewBytes: Buffer.byteLength(centrePreviewJson),
    dualFullBytes: Buffer.byteLength(dualFullJson),
    graphBytes: Buffer.byteLength(graphJson),
    lineSource: "osm-route-network",
    reports: built.reports,
  };
};

const manifest = [];

for (const mode of MODES) {
  const entry = await snapshotMode(mode);
  manifest.push(entry);
  console.log(
    `${mode}: variants ${entry.variantLines} → centre ${entry.fullLines} (${(entry.fullBytes / 1024).toFixed(0)} KB), dual ${entry.dualFullLines} (${(entry.dualFullBytes / 1024).toFixed(0)} KB), graph ${entry.graphNodes}n/${entry.graphEdges}e, ${entry.stations} stations`,
  );
}

await mkdir(UNIQUE_ROOT, { recursive: true });
await writeFile(
  path.join(UNIQUE_ROOT, "manifest.json"),
  `${JSON.stringify(
    {
      description:
        "Unique-track OSM geometry: merged centreline, dual directional tracks, and a welded junction graph. Full route variants stay in data/geography/{mode}-geometry.json; maps serve public/ copies of unique-track full.",
      snapshottedAt: new Date().toISOString(),
      modes: manifest.map(({ reports: _reports, ...entry }) => entry),
    },
    null,
    2,
  )}\n`,
);

console.log(
  `\nWrote unique-track under data/geography/unique-track/ and mirrored full LOD to public/data/geography/.`,
);
