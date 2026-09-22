"use client"

import { useMemo, useState } from "react"
import { checkComposed, composeYs } from "@/lib/tfl/investigate/vertex-scenarios/compose"
import {
  DEFAULT_LAYOUT_POLICY,
  type EndMark,
} from "@/lib/tfl/investigate/vertex-scenarios/drawing-layout"
import { composedTreeToScene } from "@/lib/tfl/investigate/vertex-scenarios/render-graph"
import {
  PORT_DEMO_NAMES,
  type DirectedMatrix,
  type DirectedMove,
  type PortId,
} from "@/lib/tfl/investigate/vertex-scenarios/types"
import { cn } from "@/lib/utils"
import { LaidDrawingSvg } from "./diagrams"
import { Pager } from "./paint"

export function CompositionExperiment({
  matrix,
  active,
  compact = false,
  mirror: mirrorProp,
  end = "terminus",
  overlay = false,
}: {
  matrix: DirectedMatrix
  active: DirectedMove | null
  compact?: boolean
  mirror?: boolean
  end?: EndMark
  overlay?: boolean
}) {
  const candidates = useMemo(() => composeYs(matrix), [matrix])
  const [candidateIndex, setCandidateIndex] = useState(0)
  const [markerIndex, setMarkerIndex] = useState(0)
  const [mirrorState, setMirrorState] = useState(true)
  const [root, setRoot] = useState<PortId>("A")
  const mirror = mirrorProp ?? mirrorState
  const composition = candidates[candidateIndex] ?? candidates[0]
  const check = composition ? checkComposed(matrix, composition) : null
  const exact = check && check.extra.length === 0 && check.missing.length === 0
  const resolvedRoot = matrix.ports.includes(root) ? root : matrix.ports[0]!
  const scene = composition
    ? composedTreeToScene(composition, resolvedRoot, markerIndex)
    : null
  const policy = {
    ...DEFAULT_LAYOUT_POLICY,
    primary: mirror ? ("left" as const) : ("right" as const),
    end,
  }
  const selectControl =
    "h-9 rounded-md border border-border bg-background px-2 text-xs text-foreground"
  return (
    <section
      className={cn("space-y-4", !compact && "rounded-xl border border-border p-5 sm:p-6")}
      aria-label="Joined Ys"
    >
      {!compact && (
        <header className="space-y-2">
          <h3 className="text-xl font-medium">Joined Ys</h3>
        </header>
      )}
      {!composition || !scene ? (
        <p className="text-sm text-muted-foreground">
          No tree of Ys matches this matrix.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <Pager
              label="Combination"
              index={candidateIndex}
              count={candidates.length}
              onChange={(next) => {
                setCandidateIndex(next)
                setMarkerIndex(0)
              }}
            />
            <Pager
              label="S placement"
              index={markerIndex}
              count={composition.markerVariants.length}
              onChange={setMarkerIndex}
            />
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              From
              <select
                className={selectControl}
                value={matrix.ports.includes(root) ? root : matrix.ports[0]}
                onChange={(e) => setRoot(e.target.value as PortId)}
              >
                {matrix.ports.map((port) => (
                  <option key={port} value={port}>
                    {PORT_DEMO_NAMES[port] ?? port}
                  </option>
                ))}
              </select>
            </label>
            {mirrorProp == null && (
              <label className="flex min-h-10 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={mirrorState}
                  onChange={(e) => setMirrorState(e.target.checked)}
                />
                Mirror
              </label>
            )}
          </div>
          <div
            className="overflow-x-auto rounded-lg border border-border p-3"
            tabIndex={0}
            role="region"
            aria-label="Joined Y drawing"
          >
            <div className="overflow-x-auto">
              <LaidDrawingSvg
                scene={scene}
                active={active}
                policy={policy}
                overlay={overlay}
              />
            </div>
          </div>
          <p
            className={cn(
              "text-sm",
              exact ? "text-muted-foreground" : "text-destructive"
            )}
            role="status"
          >
            {exact
              ? `${Object.keys(composition.stems).length} Ys · ${composition.markerVariants[0]!.length} S`
              : `${check!.missing.length} missing · ${check!.extra.length} extra`}
            {check!.extra.length > 0
              ? ` · ${check!.extra.map((m) => `${m.from}→${m.to}`).join(", ")}`
              : ""}
          </p>
        </>
      )}
    </section>
  )
}
