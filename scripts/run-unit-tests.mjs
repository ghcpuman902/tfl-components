// Runs the unit tests in two groups at the same time:
// - light files share one process (--test-isolation=none), so tsx starts once;
// - heavy files keep one process each, so the slow suites run in parallel.
// Needs Node 23.6 or later for --test-isolation.
import { spawn } from "node:child_process"
import { existsSync, globSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")

const GLOBS = [
  "lib/tfl/**/*.test.ts",
  "lib/feedback/**/*.test.ts",
  "lib/analytics/**/*.test.ts",
  "lib/landing/**/*.test.ts",
  "lib/temp/**/*.test.ts",
  "lib/brand/**/*.test.ts",
  "lib/agent/**/*.test.ts",
  "lib/dev/tfl-component-graph-analyser.test.ts",
  "lib/dev/tfl-component-graph-override.test.ts",
  "lib/dev/tfl-component-graph-wiring.test.ts",
  "lib/site-font.test.ts",
  "lib/touch-tap.test.ts",
  "lib/drag-press.test.ts",
  "lib/site-nav.test.ts",
  "lib/site-metadata.test.ts",
  "lib/domain-redirect.test.ts",
  "lib/theme-color.test.ts",
  "lib/docs-mobile-sidebar-header.test.ts",
]

// The slowest files by measured runtime; each keeps its own process.
const HEAVY = [
  "lib/tfl/homepage-live/engine.replay.test.ts",
  "lib/tfl/investigate/vertex-scenarios/case-discovery.test.ts",
  "lib/tfl/homepage-live/board-arrivals.test.ts",
  "lib/dev/tfl-component-graph-analyser.test.ts",
  "lib/tfl/stop-index-refresh.test.ts",
  "lib/dev/tfl-component-graph-override.test.ts",
  "lib/tfl/homepage-live/station-board.test.ts",
  "lib/tfl/investigate/vertex-scenarios/compose.test.ts",
  "lib/tfl/investigate/vertex-scenarios/construction.test.ts",
  "lib/tfl/explorer/selection.test.ts",
  "lib/tfl/arrivals-layout.test.ts",
]

const all = [
  ...new Set(GLOBS.flatMap((g) => globSync(g, { cwd: ROOT }))),
].sort()
const missing = HEAVY.filter((file) => !all.includes(file))
if (missing.length) {
  console.error(`Heavy test files not matched by GLOBS: ${missing.join(", ")}`)
  process.exit(1)
}
const light = all.filter((file) => !HEAVY.includes(file))

const tsx = join(ROOT, "node_modules/.bin/tsx")
if (!existsSync(tsx)) {
  console.error("tsx not found; run pnpm install first")
  process.exit(1)
}

const run = (label, args) =>
  new Promise((resolve) => {
    const child = spawn(tsx, ["--test", ...args], {
      cwd: ROOT,
      env: process.env,
    })
    let output = ""
    child.stdout.on("data", (chunk) => (output += chunk))
    child.stderr.on("data", (chunk) => (output += chunk))
    child.on("close", (code, signal) =>
      resolve({ label, code: code ?? 1, signal, output })
    )
  })

const results = await Promise.all([
  run(`light: ${light.length} files, one shared process`, [
    "--test-isolation=none",
    ...light,
  ]),
  run(`heavy: ${HEAVY.length} files, one process each`, HEAVY),
])

let failed = false
for (const { label, code, signal, output } of results) {
  process.stdout.write(`\n## ${label}\n${output}`)
  if (code !== 0) {
    failed = true
    console.error(
      `\n## ${label} failed (exit ${code}${signal ? `, ${signal}` : ""})`
    )
  }
}
process.exit(failed ? 1 : 0)
