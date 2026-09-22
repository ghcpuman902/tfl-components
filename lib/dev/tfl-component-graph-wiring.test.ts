import assert from "node:assert/strict"
import { mkdtempSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { tmpdir } from "node:os"
import { fileURLToPath } from "node:url"
import { describe, it } from "node:test"
import { layoutComponentGraph } from "./component-graph/layout"
import { readComponentGraphSnapshot } from "./component-graph/read-graph"

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..")

describe("component graph layout", () => {
  it("preserves isolated nodes in layout output", () => {
    const nodes = layoutComponentGraph(
      ["a.tsx", "b.tsx"],
      [],
      new Map([
        [
          "a.tsx",
          {
            displayName: "A",
            exports: ["A"],
            state: "stateless",
            stateSource: "inferred",
            tflData: false,
            tflDataSource: "inferred",
            evidence: [],
          },
        ],
        [
          "b.tsx",
          {
            displayName: "B",
            exports: ["B"],
            state: "stateful",
            stateSource: "inferred",
            tflData: true,
            tflDataSource: "inferred",
            evidence: [],
          },
        ],
      ])
    )
    assert.equal(nodes.length, 2)
    assert.ok(nodes.every((node) => node.orphan))
  })

  it("computes deterministic coordinates for cyclic graphs", () => {
    const edges = [
      { from: "a.tsx", to: "b.tsx" },
      { from: "b.tsx", to: "a.tsx" },
    ]
    const meta = new Map([
      [
        "a.tsx",
        {
          displayName: "A",
          exports: ["A"],
          state: "stateless" as const,
          stateSource: "inferred" as const,
          tflData: false,
          tflDataSource: "inferred" as const,
          evidence: [],
        },
      ],
      [
        "b.tsx",
        {
          displayName: "B",
          exports: ["B"],
          state: "stateless" as const,
          stateSource: "inferred" as const,
          tflData: false,
          tflDataSource: "inferred" as const,
          evidence: [],
        },
      ],
    ])
    const first = layoutComponentGraph(["a.tsx", "b.tsx"], edges, meta)
    const second = layoutComponentGraph(["a.tsx", "b.tsx"], edges, meta)
    assert.deepEqual(
      first.map((node) => ({ id: node.id, x: node.x, y: node.y, layer: node.layer })),
      second.map((node) => ({ id: node.id, x: node.x, y: node.y, layer: node.layer }))
    )
  })
})

describe("component graph discovery wiring", () => {
  it("registers a hidden internal tools entry at /docs/component-dependencies", () => {
    const catalog = readFileSync(join(repoRoot, "lib/docs-catalog.ts"), "utf8")
    assert.match(catalog, /slug: "component-dependencies"/)
    assert.match(catalog, /href: "\/docs\/component-dependencies"/)
    assert.match(catalog, /group: "tools"/)
    assert.match(catalog, /kind: "tool"/)
    assert.match(catalog, /sidebarSection: "hidden"/)
  })

  it("returns null when the snapshot file is missing", () => {
    const root = mkdtempSync(join(tmpdir(), "tfl-component-graph-read-"))
    assert.equal(readComponentGraphSnapshot(root), null)
  })

  it("hard-gates the docs page in production", () => {
    const page = readFileSync(
      join(repoRoot, "app/docs/component-dependencies/page.tsx"),
      "utf8"
    )
    assert.match(page, /NODE_ENV !== "development"/)
    assert.match(page, /notFound\(\)/)
  })

  it("keeps the tools entry out of the public sitemap", () => {
    const sitemap = readFileSync(join(repoRoot, "app/sitemap.ts"), "utf8")
    assert.match(sitemap, /isInternalDocsEntry/)
    assert.doesNotMatch(
      sitemap,
      /component-dependencies/
    )
  })
})
