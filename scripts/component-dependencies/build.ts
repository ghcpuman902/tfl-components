#!/usr/bin/env tsx
import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { buildComponentGraph } from "@/lib/dev/component-graph/analyse"
import {
  COMPONENT_GRAPH_CACHE_DIR,
  COMPONENT_GRAPH_SKELETON_FILE,
  COMPONENT_GRAPH_SNAPSHOT_FILE,
} from "@/lib/dev/component-graph/types"
import { COMPONENT_GRAPH_OVERRIDES } from "./overrides"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..")
const outDir = join(ROOT, COMPONENT_GRAPH_CACHE_DIR)

const run = () => {
  const { skeleton, snapshot, staleOverrideKeys } = buildComponentGraph({
    rootDir: ROOT,
    overrides: COMPONENT_GRAPH_OVERRIDES,
  })

  mkdirSync(outDir, { recursive: true })
  writeFileSync(
    join(outDir, COMPONENT_GRAPH_SKELETON_FILE),
    `${JSON.stringify(skeleton, null, 2)}\n`
  )
  writeFileSync(
    join(outDir, COMPONENT_GRAPH_SNAPSHOT_FILE),
    `${JSON.stringify(snapshot, null, 2)}\n`
  )

  console.log(
    `Component graph written: ${snapshot.manifest.nodeCount} nodes, ${snapshot.manifest.edgeCount} edges, ${snapshot.manifest.orphanCount} orphans.`
  )
  if (staleOverrideKeys.length > 0) {
    console.warn("Stale override keys (no matching module):")
    for (const key of staleOverrideKeys) console.warn(`  - ${key}`)
  }
}

run()
