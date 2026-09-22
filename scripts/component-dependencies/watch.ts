#!/usr/bin/env tsx
import { watch } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { spawnSync } from "node:child_process"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..")
const BUILD = join(dirname(fileURLToPath(import.meta.url)), "build.ts")

const runBuild = () => {
  const result = spawnSync("tsx", [BUILD], {
    cwd: ROOT,
    stdio: "inherit",
    env: process.env,
  })
  if (result.status !== 0) {
    console.error("Component graph build failed.")
  }
}

console.log("Watching component sources and overrides…")
runBuild()

for (const dir of ["registry/tfl", "components/tfl", "scripts/component-dependencies"]) {
  watch(join(ROOT, dir), { recursive: true }, (_event, filename) => {
    if (!filename) return
    if (!/\.(tsx?|json)$/.test(filename)) return
    runBuild()
  })
}
