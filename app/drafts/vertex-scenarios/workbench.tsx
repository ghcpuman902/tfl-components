"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { hasMove } from "@/lib/tfl/investigate/vertex-scenarios/directed-matrix"
import {
  blockLabel,
  checkConstruction,
  constructPassages,
  togglePermission,
  type Construction,
} from "@/lib/tfl/investigate/vertex-scenarios/construction"
import {
  WORKBENCH_PRESETS,
  type WorkbenchPreset,
} from "@/lib/tfl/investigate/vertex-scenarios/workbench-presets"
import {
  classifyPattern,
  composeYs,
  drawingVariants,
  DEFAULT_LAYOUT_POLICY,
  type DirectedMatrix,
  type DirectedMove,
  type LayoutPolicy,
  type PrimaryDirection,
  type VertexScenario,
} from "@/lib/tfl/investigate/vertex-scenarios"
import { PORT_LABELS } from "@/lib/tfl/investigate/vertex-scenarios/types"
import { cn } from "@/lib/utils"
import { VertexScenarioCatalogue } from "./catalogue"
import { ConstructionDrawing } from "./construction-drawing"
import { CompositionExperiment } from "./composition"
import { SimplifiedTopologySvg } from "./diagrams"

const control =
  "min-h-10 rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"

const DIRECTIONS: { id: PrimaryDirection; label: string; mark: string }[] = [
  { id: "right", label: "Right", mark: "→" },
  { id: "left", label: "Left", mark: "←" },
  { id: "up", label: "Up", mark: "↑" },
  { id: "down", label: "Down", mark: "↓" },
]

type DrawingView = "schematic" | "shared" | "pairs" | "joined"

const constructionSignature = (construction: Construction) =>
  [
    ...construction.blocks.map(blockLabel).sort(),
    ...construction.termini.slice().sort().map((port) => `T:${port}`),
  ].join("|")

const drawingViews = (matrix: DirectedMatrix): DrawingView[] => {
  if (classifyPattern(matrix) !== "other") return ["schematic"]
  const pairs = constructPassages(matrix, "pairs")
  const shared = constructPassages(matrix, "share")
  const views: DrawingView[] = ["shared"]
  if (constructionSignature(pairs) !== constructionSignature(shared)) {
    views.push("pairs")
  }
  if (composeYs(matrix).length > 0) views.push("joined")
  return views
}

const viewLabel = (view: DrawingView): string => {
  if (view === "schematic") return "Drawing"
  if (view === "shared") return "Shared"
  if (view === "pairs") return "Each pair"
  return "Joined"
}

function PermissionGrid({
  matrix,
  active,
  decoded,
  edit,
  onSelect,
  armNames,
}: {
  matrix: DirectedMatrix
  active: DirectedMove | null
  decoded?: DirectedMove[]
  edit: boolean
  onSelect: (move: DirectedMove) => void
  armNames?: WorkbenchPreset["armNames"]
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-1 text-sm">
        <caption className="sr-only">
          {decoded ? "Movements read back from the drawing" : "Required movements"}
          . Row is from, column is to.
        </caption>
        <thead>
          <tr>
            <th className="text-left text-xs font-normal text-muted-foreground">
              from ↓ to →
            </th>
            {matrix.ports.map((p) => (
              <th scope="col" key={p} title={armNames?.[p]}>
                {p}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.ports.map((from) => (
            <tr key={from}>
              <th scope="row" className="text-left" title={armNames?.[from]}>
                {from}
              </th>
              {matrix.ports.map((to) => {
                if (from === to)
                  return (
                    <td key={to} className="text-center text-muted-foreground">
                      —
                    </td>
                  )
                const wanted = hasMove(matrix, from, to)
                const allowed = decoded
                  ? decoded.some((m) => m.from === from && m.to === to)
                  : wanted
                const mismatch = wanted !== allowed
                const on = active?.from === from && active.to === to
                return (
                  <td key={to}>
                    <button
                      type="button"
                      onClick={() => onSelect({ from, to })}
                      aria-label={`${edit ? "Toggle" : "Inspect"} ${from} to ${to}: ${allowed ? "allowed" : "not allowed"}${mismatch ? (wanted ? ", missing from drawing" : ", extra in drawing") : ""}`}
                      aria-pressed={on}
                      className={cn(
                        "flex min-h-10 w-full min-w-8 cursor-pointer items-center justify-center rounded-sm focus-visible:outline-2 focus-visible:outline-ring",
                        allowed
                          ? "bg-primary/15 text-foreground"
                          : "bg-muted/60 text-muted-foreground",
                        mismatch &&
                          "bg-destructive/15 text-destructive ring-1 ring-destructive",
                        on && "outline-2 -outline-offset-2 outline-foreground"
                      )}
                    >
                      {mismatch ? (wanted ? "−" : "+") : allowed ? "●" : "·"}
                    </button>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function MatrixWorkbench({
  preset,
  presets,
  onPreset,
  policy,
  onPolicy,
}: {
  preset: WorkbenchPreset
  presets: WorkbenchPreset[]
  onPreset: (preset: WorkbenchPreset) => void
  policy: LayoutPolicy
  onPolicy: (policy: LayoutPolicy) => void
}) {
  const [matrix, setMatrix] = useState(preset.matrix)
  const [view, setView] = useState<DrawingView>(
    () => drawingViews(preset.matrix)[0]!
  )
  const [edit, setEdit] = useState(false)
  const [linked, setLinked] = useState(true)
  const [active, setActive] = useState<DirectedMove | null>(null)
  const [splitMarkers, setSplitMarkers] = useState(false)
  const [held, setHeld] = useState<Construction | null>(null)
  const [variantIndex, setVariantIndex] = useState(0)
  const views = useMemo(() => drawingViews(matrix), [matrix])
  useEffect(() => {
    if (!views.includes(view)) setView(views[0]!)
  }, [views, view])
  const kind = classifyPattern(matrix)
  const variants =
    kind === "triangle" ? [] : drawingVariants(kind)
  const variant = variants[variantIndex] ?? drawingVariants(kind)[0]!
  const method = view === "pairs" ? "pairs" : "share"
  const proposed = useMemo(
    () => constructPassages(matrix, method),
    [matrix, method]
  )
  const construction = held ?? proposed
  const check = checkConstruction(matrix, construction)
  const handleCell = (move: DirectedMove) => {
    setActive(move)
    if (!edit) return
    setHeld(null)
    setMatrix(togglePermission(matrix, move.from, move.to, linked))
  }
  const handleReset = () => {
    setMatrix(preset.matrix)
    setHeld(null)
    setActive(null)
    setVariantIndex(0)
  }
  const handleDirection = (primary: PrimaryDirection) => {
    onPolicy({ ...policy, primary })
  }

  return (
    <section
      id="workbench"
      className="scroll-mt-24 space-y-4"
      aria-labelledby="workbench-heading"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="workbench-heading" className="text-2xl font-medium">
          One station
        </h2>
        <a
          href="#building-blocks"
          className="text-sm underline underline-offset-4"
        >
          Building blocks
        </a>
      </div>
      <div className="rounded-xl border border-border">
        <div className="space-y-3 border-b border-border bg-muted/25 p-4 sm:p-5">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex min-w-40 flex-1 flex-col gap-1.5 text-xs text-muted-foreground">
              Case
              <select
                className={cn(control, "w-full text-foreground")}
                value={preset.id}
                onChange={(event) =>
                  onPreset(presets.find((p) => p.id === event.target.value)!)
                }
              >
                {presets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
              Arms
              <select
                className={cn(control, "text-foreground")}
                value={matrix.ports.length}
                onChange={(event) => {
                  const ports = PORT_LABELS.slice(0, Number(event.target.value))
                  setMatrix({
                    ports,
                    moves: matrix.moves.filter(
                      (m) => ports.includes(m.from) && ports.includes(m.to)
                    ),
                  })
                  setActive(null)
                  setHeld(null)
                }}
              >
                {[2, 3, 4, 5, 6].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </label>
            <div className="flex flex-col gap-1.5">
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
                      control,
                      "min-w-10 px-2 text-base",
                      policy.primary === item.id &&
                        "border-foreground bg-foreground text-background"
                    )}
                    onClick={() => handleDirection(item.id)}
                  >
                    {item.mark}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex min-h-10 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={linked}
                onChange={(event) => setLinked(event.target.checked)}
              />
              Both ways
            </label>
            <button
              type="button"
              aria-pressed={edit}
              className={cn(
                control,
                edit && "border-foreground bg-foreground text-background"
              )}
              onClick={() => setEdit(!edit)}
            >
              Edit
            </button>
            <button type="button" className={control} onClick={handleReset}>
              Reset
            </button>
          </div>
          {preset.armNames ? (
            <p className="text-xs text-muted-foreground">
              {matrix.ports
                .map((port) => `${port} ${preset.armNames?.[port] ?? ""}`.trim())
                .join(" · ")}
            </p>
          ) : null}
        </div>

        <div className="grid min-w-0 lg:grid-cols-[minmax(260px,0.9fr)_minmax(0,1.4fr)]">
          <div className="min-w-0 space-y-3 border-b border-border p-4 sm:p-5 lg:border-r lg:border-b-0">
            <PermissionGrid
              matrix={matrix}
              active={active}
              decoded={
                view === "pairs" || view === "shared"
                  ? check.decoded
                  : undefined
              }
              edit={edit}
              onSelect={handleCell}
              armNames={preset.armNames}
            />
            {active ? (
              <p className="text-sm text-muted-foreground" aria-live="polite">
                {active.from} → {active.to}
                {hasMove(matrix, active.from, active.to) ? "" : " · not permitted"}
              </p>
            ) : null}
          </div>

          <div className="min-w-0 space-y-4 p-4 sm:p-5">
            {(views.length > 1 ||
              (view === "schematic" && variants.length > 1) ||
              view === "pairs" ||
              view === "shared") && (
              <div className="flex flex-wrap items-center gap-2">
                {views.length > 1 ? (
                  <div
                    className="flex flex-wrap gap-1"
                    role="group"
                    aria-label="Drawing"
                  >
                    {views.map((item) => (
                      <button
                        type="button"
                        key={item}
                        aria-pressed={view === item}
                        className={cn(
                          control,
                          view === item &&
                            "border-foreground bg-foreground text-background"
                        )}
                        onClick={() => {
                          setView(item)
                          setHeld(null)
                        }}
                      >
                        {viewLabel(item)}
                      </button>
                    ))}
                  </div>
                ) : null}
                {view === "schematic" && variants.length > 1
                  ? variants.map((item, index) => (
                      <button
                        type="button"
                        key={item.id}
                        aria-pressed={index === variantIndex}
                        className={cn(
                          control,
                          index === variantIndex &&
                            "border-foreground bg-foreground text-background"
                        )}
                        onClick={() => setVariantIndex(index)}
                      >
                        {item.label}
                      </button>
                    ))
                  : null}
                {(view === "pairs" || view === "shared") && (
                  <label className="ml-auto flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={splitMarkers}
                      onChange={(event) => setSplitMarkers(event.target.checked)}
                    />
                    S after forks
                  </label>
                )}
              </div>
            )}

            {view === "joined" ? (
              <CompositionExperiment
                compact
                matrix={matrix}
                active={active}
                photoCase={preset.id === "earls-court"}
                mirror={policy.primary === "left"}
                onAdoptPhotoPermissions={() => {
                  setMatrix({
                    ...matrix,
                    moves: [
                      ...matrix.moves.filter(
                        (m) =>
                          !(
                            (m.from === "B" && m.to === "E") ||
                            (m.from === "E" && m.to === "B")
                          )
                      ),
                      { from: "B", to: "E" },
                      { from: "E", to: "B" },
                    ],
                  })
                  setHeld(null)
                }}
              />
            ) : view === "schematic" ? (
              <div className="rounded-lg border border-border bg-background p-3">
                <SimplifiedTopologySvg
                  kind={kind}
                  variant={variant.id}
                  active={active}
                  policy={policy}
                />
              </div>
            ) : (
              <div
                className="max-h-[560px] overflow-auto rounded-lg border border-border bg-background"
                tabIndex={0}
                role="region"
                aria-label="Construction drawing"
              >
                <ConstructionDrawing
                  construction={construction}
                  active={active}
                  splitMarkers={splitMarkers}
                />
              </div>
            )}

            {view !== "joined" && view !== "schematic" && (
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                <p>
                  {construction.blocks.length} block
                  {construction.blocks.length === 1 ? "" : "s"}
                  {check.exact ? "" : " · does not match"}
                </p>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={held != null}
                    onChange={(event) => {
                      setHeld(event.target.checked ? construction : null)
                      if (event.target.checked) setEdit(true)
                    }}
                  />
                  Hold
                </label>
              </div>
            )}
            {held && !check.exact && (
              <button
                type="button"
                className={control}
                onClick={() => setHeld(null)}
              >
                Rebuild
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

export function VertexScenarioWorkspace({
  scenarios,
  observed,
  initialCase,
}: {
  scenarios: VertexScenario[]
  observed: WorkbenchPreset | null
  initialCase?: string
}) {
  const presets = [...WORKBENCH_PRESETS, ...(observed ? [observed] : [])]
  const [selection, setSelection] = useState({
    preset:
      presets.find((preset) => preset.id === initialCase) ??
      WORKBENCH_PRESETS[0]!,
    revision: 0,
  })
  const [policy, setPolicy] = useState<LayoutPolicy>(DEFAULT_LAYOUT_POLICY)
  if (!presets.some((p) => p.id === selection.preset.id))
    presets.push(selection.preset)
  const handlePreset = (preset: WorkbenchPreset) =>
    setSelection((previous) => ({ preset, revision: previous.revision + 1 }))
  return (
    <div className="space-y-14">
      <MatrixWorkbench
        key={selection.revision}
        preset={selection.preset}
        presets={presets}
        onPreset={handlePreset}
        policy={policy}
        onPolicy={setPolicy}
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
          onExplore={(scenario) => {
            handlePreset({
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
