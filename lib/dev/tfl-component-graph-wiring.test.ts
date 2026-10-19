import assert from "node:assert/strict"
import { mkdtempSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { describe, it } from "node:test"
import { layoutComponentGraph } from "./component-graph/layout"
import { readComponentGraphSnapshot } from "./component-graph/read-graph"

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
  it("returns null when the snapshot file is missing", () => {
    const root = mkdtempSync(join(tmpdir(), "tfl-component-graph-read-"))
    assert.equal(readComponentGraphSnapshot(root), null)
  })
})
