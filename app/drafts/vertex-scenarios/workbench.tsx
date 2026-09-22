"use client"

import { useState } from "react"
import Link from "next/link"
import { hasMove } from "@/lib/tfl/investigate/vertex-scenarios/directed-matrix"
import { togglePermission } from "@/lib/tfl/investigate/vertex-scenarios/construction"
import type { WorkbenchPreset } from "@/lib/tfl/investigate/vertex-scenarios/workbench-presets"
import {
  classifyPattern,
  directedSignature,
  drawingVariants,
  DEFAULT_LAYOUT_POLICY,
  type DirectedMatrix,
  type DirectedMove,
  type EndMark,
  type LayoutPolicy,
  type PrimaryDirection,
  type VertexScenario,
} from "@/lib/tfl/investigate/vertex-scenarios"
import { PORT_LABELS } from "@/lib/tfl/investigate/vertex-scenarios/types"
import { cn } from "@/lib/utils"
import { VertexScenarioCatalogue } from "./catalogue"
import { CompositionExperiment } from "./composition"
import {
  DrawingVariantSelect,
  SimplifiedTopologySvg,
} from "./diagrams"
import { MovementMatrix, useMovementPreview } from "./movement-matrix"

const selectControl =
  "h-9 rounded-md border border-border bg-background px-2 text-xs text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"

/** Same on/off control as `/drafts/diagram-atoms`'s `Toggle`. */
const Toggle = ({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (next: boolean) => void
}) => (
  <div className="flex flex-col gap-1">
    <p className="text-xs text-muted-foreground">{label}</p>
    <div className="flex gap-1" role="group" aria-label={label}>
      {(
        [
          { on: true, name: "On" },
          { on: false, name: "Off" },
        ] as const
      ).map((item) => (
        <button
          type="button"
          key={item.name}
          aria-pressed={value === item.on}
          className={cn(
            "h-9 rounded-md border border-border bg-background px-3 text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            value === item.on &&
              "border-foreground bg-foreground text-background"
          )}
          onClick={() => onChange(item.on)}
        >
          {item.name}
        </button>
      ))}
    </div>
  </div>
)

const DIRECTIONS: { id: PrimaryDirection; label: string; mark: string }[] = [
  { id: "right", label: "Right", mark: "→" },
  { id: "left", label: "Left", mark: "←" },
  { id: "up", label: "Up", mark: "↑" },
  { id: "down", label: "Down", mark: "↓" },
]

const ENDS: { id: EndMark; label: string }[] = [
  { id: "terminus", label: "Terminus" },
  { id: "through", label: "Through" },
]

const matrixSignature = (matrix: DirectedMatrix): string =>
  `${matrix.ports.join(",")}|${directedSignature(matrix)}`

function MatrixWorkbench({
  preset,
  presets,
  matrix,
  onMatrix,
  onPreset,
  policy,
  onPolicy,
  custom,
  overlay,
  onOverlay,
}: {
  preset: WorkbenchPreset
  presets: WorkbenchPreset[]
  matrix: DirectedMatrix
  onMatrix: (matrix: DirectedMatrix) => void
  onPreset: (preset: WorkbenchPreset) => void
  policy: LayoutPolicy
  onPolicy: (policy: LayoutPolicy) => void
  custom: boolean
  /** Shared with `VertexScenarioCatalogue` below — one "Margins" toggle for the whole page, matching `/drafts/diagram-atoms`. */
  overlay: boolean
  onOverlay: (next: boolean) => void
}) {
  const [linked, setLinked] = useState(true)
  const { preview, setPreview } = useMovementPreview()
  const [variantIndex, setVariantIndex] = useState(0)
  const kind = classifyPattern(matrix)
  const variants = drawingVariants(kind)
  const variant = variants[Math.min(variantIndex, variants.length - 1)]!
  const joined = kind === "other"
  const handleToggle = (move: DirectedMove) => {
    onMatrix(togglePermission(matrix, move.from, move.to, linked))
  }

  return (
    <section
      id="workbench"
      className="scroll-mt-24"
      aria-labelledby="workbench-heading"
    >
      <div className="overflow-hidden rounded-xl border border-border">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4 sm:px-5">
          <h2 id="workbench-heading" className="text-2xl font-medium">
            One station
          </h2>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <Link href="/drafts/diagram-atoms" className="underline underline-offset-4">
              Diagram atoms
            </Link>
            <a href="#building-blocks" className="underline underline-offset-4">
              Building blocks
            </a>
          </div>
        </header>

        <div className="space-y-2 border-b border-border p-4 sm:px-5">
          <p className="text-xs text-muted-foreground">Cases</p>
          <div
            className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0"
            role="group"
            aria-label="Cases"
          >
            {presets.map((item) => {
              const selected = !custom && preset.id === item.id
              return (
                <button
                  type="button"
                  key={item.id}
                  aria-pressed={selected}
                  className={cn(
                    "min-h-8 shrink-0 rounded-full border border-border bg-background px-3 py-1 text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    selected &&
                      "border-foreground bg-foreground text-background"
                  )}
                  onClick={() => {
                    setPreview(null)
                    setVariantIndex(0)
                    onPreset(item)
                  }}
                >
                  {item.title}
                </button>
              )
            })}
            {custom ? (
              <span className="inline-flex min-h-8 shrink-0 items-center rounded-full border border-foreground bg-foreground px-3 py-1 text-xs text-background">
                Custom
              </span>
            ) : null}
          </div>
        </div>

        <div className="space-y-3 border-b border-border bg-muted/25 p-4 sm:px-5">
          <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Arms
              <select
                className={selectControl}
                value={matrix.ports.length}
                onChange={(event) => {
                  const ports = PORT_LABELS.slice(0, Number(event.target.value))
                  onMatrix({
                    ports,
                    moves: matrix.moves.filter(
                      (move) =>
                        ports.includes(move.from) && ports.includes(move.to)
                    ),
                  })
                  setPreview(null)
                  setVariantIndex(0)
                }}
              >
                {[2, 3, 4, 5, 6].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </label>
            <div className="flex flex-col gap-1">
              <p className="text-xs text-muted-foreground">Direction</p>
              <div
                className="flex gap-1"
                role="group"
                aria-label="Primary drawing direction"
              >
                {DIRECTIONS.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    aria-label={item.label}
                    aria-pressed={policy.primary === item.id}
                    className={cn(
                      "h-9 min-w-9 rounded-md border border-border bg-background px-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                      policy.primary === item.id &&
                        "border-foreground bg-foreground text-background"
                    )}
                    onClick={() => onPolicy({ ...policy, primary: item.id })}
                  >
                    {item.mark}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-xs text-muted-foreground">Ends</p>
              <div
                className="flex gap-1"
                role="group"
                aria-label="End marks"
              >
                {ENDS.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    aria-pressed={policy.end === item.id}
                    className={cn(
                      "h-9 rounded-md border border-border bg-background px-3 text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                      policy.end === item.id &&
                        "border-foreground bg-foreground text-background"
                    )}
                    onClick={() => onPolicy({ ...policy, end: item.id })}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <Toggle label="Margins" value={overlay} onChange={onOverlay} />
          </div>
        </div>

        <div className="grid min-w-0 lg:grid-cols-[minmax(260px,0.9fr)_minmax(0,1.4fr)]">
          <div className="min-w-0 space-y-3 border-b border-border p-4 sm:p-5 lg:border-r lg:border-b-0">
            <MovementMatrix
              matrix={matrix}
              preview={preview}
              onPreview={setPreview}
              onToggle={handleToggle}
              linked={linked}
              onLinkedChange={setLinked}
              density="comfortable"
            />
            {preview ? (
              <p className="text-sm text-muted-foreground" aria-live="polite">
                {preview.from} → {preview.to}
                {hasMove(matrix, preview.from, preview.to)
                  ? ""
                  : " · not permitted"}
              </p>
            ) : null}
          </div>

          <div className="min-w-0 space-y-4 p-4 sm:p-5">
            {joined ? (
              <CompositionExperiment
                compact
                matrix={matrix}
                active={preview}
                mirror={policy.primary === "left"}
                end={policy.end}
                overlay={overlay}
              />
            ) : (
              <div className="space-y-3">
                <DrawingVariantSelect
                  kind={kind}
                  index={variantIndex}
                  onChange={setVariantIndex}
                />
                <div className="overflow-x-auto rounded-lg border border-border bg-background p-3">
                  <SimplifiedTopologySvg
                    kind={kind}
                    variant={variant.id}
                    active={preview}
                    policy={policy}
                    overlay={overlay}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

export function VertexScenarioWorkspace({
  scenarios,
  cases,
  initialCase,
}: {
  scenarios: VertexScenario[]
  cases: WorkbenchPreset[]
  initialCase?: string
}) {
  const availablePresets = cases
  const [preset, setPreset] = useState(
    () =>
      availablePresets.find((item) => item.id === initialCase) ??
      availablePresets[0]!
  )
  const [matrix, setMatrix] = useState(() => preset.matrix)
  const [policy, setPolicy] = useState<LayoutPolicy>(DEFAULT_LAYOUT_POLICY)
  const [overlay, setOverlay] = useState(false)
  const custom = matrixSignature(matrix) !== matrixSignature(preset.matrix)
  const presets = availablePresets.some((item) => item.id === preset.id)
    ? availablePresets
    : [...availablePresets, preset]
  const applyPreset = (next: WorkbenchPreset) => {
    setPreset(next)
    setMatrix(next.matrix)
  }
  return (
    <div className="space-y-14">
      <MatrixWorkbench
        preset={preset}
        presets={presets}
        matrix={matrix}
        onMatrix={setMatrix}
        onPreset={applyPreset}
        policy={policy}
        onPolicy={setPolicy}
        custom={custom}
        overlay={overlay}
        onOverlay={setOverlay}
      />
      <section
        id="building-blocks"
        className="scroll-mt-24 space-y-6"
        aria-labelledby="blocks-heading"
      >
        <h2 id="blocks-heading" className="text-2xl font-medium">
          Building blocks
        </h2>
        <VertexScenarioCatalogue
          scenarios={scenarios}
          policy={policy}
          overlay={overlay}
          onExplore={(scenario) => {
            applyPreset({
              id: scenario.id,
              title: `${scenario.degree} arms · ${scenario.title}`,
              note: scenario.note,
              matrix: scenario.matrix,
            })
            window.location.hash = "workbench"
            document
              .getElementById("workbench")
              ?.scrollIntoView({ block: "start" })
          }}
        />
      </section>
      <p className="border-t border-border pt-6 text-sm text-muted-foreground">
        <Link
          href="/docs/drawing-the-line"
          className="text-foreground underline underline-offset-4"
        >
          Drawing the line
        </Link>
      </p>
    </div>
  )
}
