import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  COMPONENT_GRAPH_CACHE_DIR,
  COMPONENT_GRAPH_SNAPSHOT_FILE,
  type ComponentGraphSnapshot,
} from "./types"

export const componentGraphBuildCommand = "pnpm component-graph:build"

export const readComponentGraphSnapshot = (
  rootDir: string
): ComponentGraphSnapshot | null => {
  const path = join(
    rootDir,
    COMPONENT_GRAPH_CACHE_DIR,
    COMPONENT_GRAPH_SNAPSHOT_FILE
  )
  try {
    const raw = readFileSync(path, "utf8")
    return JSON.parse(raw) as ComponentGraphSnapshot
  } catch {
    return null
  }
}
