"use client"

import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react"
import {
  drawingVariants,
  type LayoutPolicy,
} from "@/lib/tfl/investigate/vertex-scenarios"
import type { VertexScenario } from "@/lib/tfl/investigate/vertex-scenarios/types"
import {
  DrawingVariantSelect,
  RawVertexSvg,
  SimplifiedTopologySvg,
} from "./diagrams"
import { MovementMatrix, useMovementPreview } from "./movement-matrix"

const parseHash = (hash: string): string | null => {
  const id = hash.replace(/^#/, "")
  return id || null
}

const subscribeHash = (onChange: () => void) => {
  window.addEventListener("hashchange", onChange)
  return () => window.removeEventListener("hashchange", onChange)
}

const Stage = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="min-w-0 space-y-2 overflow-x-auto border border-border p-3">
    <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
      {label}
    </p>
    {children}
  </div>
)

const PatternRow = ({
  scenario,
  onExplore,
  policy,
  overlay,
}: {
  scenario: VertexScenario
  onExplore?: (scenario: VertexScenario) => void
  policy?: LayoutPolicy
  overlay?: boolean
}) => {
  const variants = drawingVariants(scenario.kind)
  const [variantIndex, setVariantIndex] = useState(0)
  const { preview, setPreview } = useMovementPreview()
  const variant = variants[variantIndex] ?? variants[0]!
  return (
    <article
      id={scenario.id}
      className="scroll-mt-24 space-y-3 border border-border p-3"
    >
      <header className="space-y-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-base font-medium text-foreground">
            <a
              href={`#${scenario.id}`}
              className="underline-offset-2 hover:underline"
            >
              {scenario.title}
            </a>
          </h3>
          {scenario.directional ? (
            <p className="text-xs text-muted-foreground">
              Also observed one-way
            </p>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">{scenario.note}</p>
        {onExplore && (
          <button
            type="button"
            className="min-h-10 text-sm underline underline-offset-4"
            onClick={() => onExplore(scenario)}
          >
            Use here
          </button>
        )}
      </header>
      <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="min-w-0 space-y-3">
          <Stage label="Star">
            <RawVertexSvg matrix={scenario.matrix} active={preview} />
          </Stage>
          <Stage label="Matrix">
            <MovementMatrix
              matrix={scenario.matrix}
              preview={preview}
              onPreview={setPreview}
              density="compact"
            />
          </Stage>
        </div>
        <Stage label="Drawing">
          <SimplifiedTopologySvg
            kind={scenario.kind}
            variant={variant.id}
            active={preview}
            policy={policy}
            overlay={overlay}
          />
          <DrawingVariantSelect
            kind={scenario.kind}
            index={variantIndex}
            onChange={setVariantIndex}
          />
        </Stage>
      </div>
    </article>
  )
}

const FilterSelect = ({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}) => (
  <label className="flex min-w-36 flex-col gap-1 text-xs text-muted-foreground">
    {label}
    <select
      name={label.toLowerCase().replace(/\s+/g, "-")}
      className="h-9 border border-border bg-background px-2 text-xs text-foreground"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </label>
)

export const VertexScenarioCatalogue = ({
  scenarios,
  onExplore,
  policy,
  overlay,
}: {
  scenarios: VertexScenario[]
  onExplore?: (scenario: VertexScenario) => void
  policy?: LayoutPolicy
  /** Same "Margins" toggle as `/drafts/diagram-atoms` and the workbench above. */
  overlay?: boolean
}) => {
  const [degree, setDegree] = useState("all")
  const hash = useSyncExternalStore(
    subscribeHash,
    () => window.location.hash,
    () => ""
  )
  const selectedId = parseHash(hash)

  const visible = useMemo(
    () =>
      scenarios.filter(
        (scenario) => degree === "all" || String(scenario.degree) === degree
      ),
    [degree, scenarios]
  )

  useEffect(() => {
    if (!selectedId) return
    const el = document.getElementById(selectedId)
    el?.scrollIntoView({ block: "start" })
  }, [selectedId])

  const degrees = [
    ...new Set(scenarios.map((scenario) => scenario.degree)),
  ].sort((a, b) => a - b)
  const grouped = useMemo(() => {
    const groups: { degree: number; scenarios: VertexScenario[] }[] = []
    for (const scenario of visible) {
      const last = groups[groups.length - 1]
      if (!last || last.degree !== scenario.degree) {
        groups.push({ degree: scenario.degree, scenarios: [scenario] })
      } else {
        last.scenarios.push(scenario)
      }
    }
    return groups
  }, [visible])

  return (
    <div className="space-y-10">
      <fieldset className="flex flex-wrap gap-3 border border-border p-3">
        <legend className="px-1 text-xs font-medium text-muted-foreground">
          Filters
        </legend>
        <FilterSelect
          label="Degree"
          value={degree}
          onChange={setDegree}
          options={[
            { value: "all", label: "All" },
            ...degrees.map((value) => ({
              value: String(value),
              label: String(value),
            })),
          ]}
        />
      </fieldset>

      {grouped.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No patterns match this filter.
        </p>
      ) : (
        grouped.map((group) => (
          <section
            key={group.degree}
            className="space-y-6"
            aria-labelledby={`degree-${group.degree}`}
          >
            <h2
              id={`degree-${group.degree}`}
              className="border-b border-border pb-1.5 text-lg font-medium text-foreground"
            >
              Degree {group.degree}
            </h2>
            {group.scenarios.map((scenario) => (
              <PatternRow
                key={scenario.id}
                scenario={scenario}
                onExplore={onExplore}
                policy={policy}
                overlay={overlay}
              />
            ))}
          </section>
        ))
      )}
    </div>
  )
}
