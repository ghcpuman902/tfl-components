import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  analyseModuleText,
  discoverCandidateModuleIds,
} from "./component-graph/analyse"

describe("component graph analyser", { concurrency: 1 }, () => {
  it("discovers registry and components tfl tsx modules", () => {
    const ids = discoverCandidateModuleIds(process.cwd())
    assert.ok(ids.some((id) => id === "registry/tfl/brand/line-badge.tsx"))
    assert.ok(ids.some((id) => id === "components/tfl/station-name.tsx"))
  })

  it("infers stateful modules from React hooks", () => {
    const analysis = analyseModuleText(
      "registry/tfl/example/stateful.tsx",
      `"use client"
import { useState } from "react"
export function StatefulBoard() {
  const [open, setOpen] = useState(false)
  return <button onClick={() => setOpen(!open)}>{open ? "Open" : "Closed"}</button>
}
`,
      process.cwd()
    )
    assert.equal(analysis?.inferredState, "stateful")
  })

  it("infers stateless modules without owning hooks", () => {
    const analysis = analyseModuleText(
      "registry/tfl/example/stateless.tsx",
      `export function StatelessChip({ label }: { label: string }) {
  return <span>{label}</span>
}
`,
      process.cwd()
    )
    assert.equal(analysis?.inferredState, "stateless")
  })

  it("rings exported props that reference tfl-ts types", () => {
    const analysis = analyseModuleText(
      "registry/tfl/example/data-aware.tsx",
      `import type { RealtimePrediction } from "tfl-ts"
export type DataBoardProps = {
  data?: readonly RealtimePrediction[]
}
export function DataBoard({ data = [] }: DataBoardProps) {
  return <div>{data.length}</div>
}
`,
      process.cwd()
    )
    assert.equal(analysis?.inferredTflData, true)
  })

  it("does not ring generic props when tfl-ts is only used internally", () => {
    const analysis = analyseModuleText(
      "registry/tfl/example/internal-helper.tsx",
      `import { getLineAriaLabel } from "tfl-ts"
export function LineBadge({ lineId }: { lineId: string }) {
  return <span aria-label={getLineAriaLabel(lineId)}>{lineId}</span>
}
`,
      process.cwd()
    )
    assert.equal(analysis?.inferredTflData, false)
  })
})
