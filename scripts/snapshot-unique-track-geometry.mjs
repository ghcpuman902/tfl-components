/**
 * Build unique-track geometry for map rendering.
 *
 * Reads full OSM route-variant bundles from `data/geography/{mode}-geometry.json`
 * (kept for internal / explorer use) and writes:
 *   - `data/geography/unique-track/{mode}/{full|preview}.json`
 *   - `public/data/geography/{mode}-geometry.json` ← maps fetch this (full LOD)
 *   - `data/geography/unique-track/manifest.json`
 *
 *   pnpm geography:unique-track
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  collapseTransitBundle,
  FULL_SIMPLIFY_DEG,
  PREVIEW_SIMPLIFY_DEG,
} from "./collapse-transit-geometry.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA_ROOT = path.join(ROOT, "data/geography");
const UNIQUE_ROOT = path.join(DATA_ROOT, "unique-track");
const PUBLIC_ROOT = path.join(ROOT, "public/data/geography");
const MODES = ["tube", "overground", "elizabeth", "dlr", "tram"];

const snapshotMode = async (mode) => {
  const sourcePath = path.join(DATA_ROOT, `${mode}-geometry.json`);
  const raw = JSON.parse(await readFile(sourcePath, "utf8"));
  const full = collapseTransitBundle(raw, FULL_SIMPLIFY_DEG);
  const preview = collapseTransitBundle(raw, PREVIEW_SIMPLIFY_DEG);

  const outDir = path.join(UNIQUE_ROOT, mode);
  await mkdir(outDir, { recursive: true });

  const fullJson = JSON.stringify(full);
  const previewJson = JSON.stringify(preview);
  await writeFile(path.join(outDir, "full.json"), fullJson);
  await writeFile(path.join(outDir, "preview.json"), previewJson);

  // Maps and docs demos load from /data/geography/{mode}-geometry.json
  await mkdir(PUBLIC_ROOT, { recursive: true });
  await writeFile(path.join(PUBLIC_ROOT, `${mode}-geometry.json`), fullJson);

  return {
    mode,
    source: path.relative(ROOT, sourcePath),
    stations: full.stations?.features?.length ?? 0,
    variantLines: raw.lines?.features?.length ?? 0,
    fullLines: full.lines?.features?.length ?? 0,
    previewLines: preview.lines?.features?.length ?? 0,
    fullBytes: Buffer.byteLength(fullJson),
    previewBytes: Buffer.byteLength(previewJson),
    lineSource: full.lines?.meta?.source ?? null,
  };
};

const manifest = [];

for (const mode of MODES) {
  const entry = await snapshotMode(mode);
  manifest.push(entry);
  console.log(
    `${mode}: variants ${entry.variantLines} → full ${entry.fullLines} (${(entry.fullBytes / 1024).toFixed(0)} KB), preview ${entry.previewLines} (${(entry.previewBytes / 1024).toFixed(0)} KB), ${entry.stations} stations`,
  );
}

await mkdir(UNIQUE_ROOT, { recursive: true });
await writeFile(
  path.join(UNIQUE_ROOT, "manifest.json"),
  `${JSON.stringify(
    {
      description:
        "Unique-track OSM geometry for map drawing. Full route variants stay in data/geography/{mode}-geometry.json; maps serve public/ copies of unique-track full.",
      snapshottedAt: new Date().toISOString(),
      modes: manifest,
    },
    null,
    2,
  )}\n`,
);

console.log(
  `\nWrote unique-track under data/geography/unique-track/ and mirrored full LOD to public/data/geography/.`,
);
