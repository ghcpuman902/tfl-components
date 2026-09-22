import assert from "node:assert/strict"
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { describe, it } from "node:test"
import { buildComponentGraph } from "./component-graph/analyse"

describe("component graph overrides", () => {
  it("applies overrides after skeleton inference", () => {
    const root = mkdtempSync(join(tmpdir(), "tfl-component-graph-"))
    mkdirSync(join(root, "registry/tfl/demo"), { recursive: true })
    writeFileSync(
      join(root, "registry/tfl/demo/orphan.tsx"),
      `export function OrphanDemo() { return <div /> }
`,
      "utf8"
    )
    writeFileSync(
      join(root, "registry/tfl/demo/typed.tsx"),
      `import type { RealtimePrediction } from "tfl-ts"
export type TypedProps = { data: RealtimePrediction[] }
export function TypedBoard({ data }: TypedProps) { return <div>{data.length}</div> }
`,
      "utf8"
    )
    writeFileSync(
      join(root, "tsconfig.json"),
      JSON.stringify(
        {
          compilerOptions: {
            target: "ES2017",
            module: "ESNext",
            moduleResolution: "bundler",
            jsx: "react-jsx",
            baseUrl: ".",
            paths: {
              "@/*": ["./*"],
              "@/components/tfl/*": ["./registry/tfl/*"],
            },
          },
          include: ["registry/tfl/**/*.tsx"],
        },
        null,
        2
      ),
      "utf8"
    )

    const { snapshot } = buildComponentGraph({
      rootDir: root,
      overrides: {
        "registry/tfl/demo/orphan.tsx": {
          displayName: "Custom orphan",
          note: "Review me",
        },
        "registry/tfl/demo/typed.tsx": {
          tflData: false,
          note: "Force generic for test",
        },
      },
    })

    const orphan = snapshot.nodes.find(
      (node) => node.id === "registry/tfl/demo/orphan.tsx"
    )
    const typed = snapshot.nodes.find(
      (node) => node.id === "registry/tfl/demo/typed.tsx"
    )
    assert.ok(orphan)
    assert.equal(orphan.displayName, "Custom orphan")
    assert.equal(orphan.orphan, true)
    assert.equal(typed?.tflData, false)
    assert.equal(typed?.tflDataSource, "override")
  })
})
