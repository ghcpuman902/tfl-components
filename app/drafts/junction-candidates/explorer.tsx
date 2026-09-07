"use client"

import { useEffect, useMemo, useState, useSyncExternalStore } from "react"
import { LineBadge } from "@/components/tfl/brand/line-badge"
import { formatStationName } from "@/lib/tfl/diagram-station"
import { FEATURED_EXPLORER_KEYS, explorerKey } from "@/lib/tfl/investigate/candidates/ids"
import { boundaryLabels } from "@/lib/tfl/investigate/candidates/labels"
import type { JunctionExplorerModel, ReconstructedPair } from "@/lib/tfl/investigate/candidates/types"
import { cn } from "@/lib/utils"
import { CandidateMatrix } from "./candidate-matrix"
import { CandidateTreeSvg } from "./candidate-tree"

type CellRef = { a: string; b: string }

const parseHash = (hash: string): { key: string; candidateId: string } | null => {
  const trimmed = hash.replace(/^#/, "")
  if (!trimmed) return null
  const [lineId, stationId, candidateId] = trimmed.split("/")
  if (!lineId || !stationId) return null
  return { key: explorerKey(lineId, stationId), candidateId: candidateId || "c1" }
}

const subscribeHash = (onChange: () => void) => {
  window.addEventListener("hashchange", onChange)
  return () => window.removeEventListener("hashchange", onChange)
}

const writeHash = (lineId: string, stationId: string, candidateId: string) => {
  const next = `#${lineId}/${stationId}/${candidateId}`
  if (window.location.hash === next) return
  history.replaceState(null, "", next)
  window.dispatchEvent(new HashChangeEvent("hashchange"))
}

const short = (name: string) => formatStationName(name)

export const JunctionCandidateExplorer = ({
  models,
}: {
  models: JunctionExplorerModel[]
}) => {
  const byKey = useMemo(
    () => new Map(models.map((model) => [explorerKey(model.lineId, model.station.id), model])),
    [models]
  )
  const featured = FEATURED_EXPLORER_KEYS.map((key) => byKey.get(key)).filter(
    (model): model is JunctionExplorerModel => model != null
  )
  const defaultKey = featured[0]
    ? explorerKey(featured[0].lineId, featured[0].station.id)
    : explorerKey(models[0]!.lineId, models[0]!.station.id)

  const hash = useSyncExternalStore(subscribeHash, () => window.location.hash, () => "")
  const parsed = parseHash(hash)
  const key = parsed && byKey.has(parsed.key) ? parsed.key : defaultKey
  const candidateId = parsed?.candidateId ?? "c1"
  const [hovered, setHovered] = useState<CellRef | null>(null)
  const [selected, setSelected] = useState<CellRef | null>(null)

  const model = byKey.get(key) ?? models[0]!
  const candidate =
    model.candidates.find((entry) => entry.id === candidateId) ?? model.candidates[0]
  const index = candidate ? model.candidates.findIndex((entry) => entry.id === candidate.id) : 0

  useEffect(() => {
    if (!candidate) return
    if (parseHash(window.location.hash)) return
    writeHash(model.lineId, model.station.id, candidate.id)
  }, [candidate, model.lineId, model.station.id])

  const handleSelectJunction = (next: JunctionExplorerModel) => {
    writeHash(next.lineId, next.station.id, next.candidates[0]?.id ?? "c1")
    setSelected(null)
    setHovered(null)
  }

  const handleStep = (delta: number) => {
    if (model.candidates.length === 0) return
    const next = (index + delta + model.candidates.length) % model.candidates.length
    writeHash(model.lineId, model.station.id, model.candidates[next]!.id)
    setSelected(null)
    setHovered(null)
  }

  const names = useMemo(() => boundaryLabels(model.neighbours), [model.neighbours])

  const activeCell = selected ?? hovered
  const highlight: ReconstructedPair | null = candidate
    ? (candidate.reconstructed.find(
        (pair) =>
          activeCell &&
          ((pair.a === activeCell.a && pair.b === activeCell.b) ||
            (pair.a === activeCell.b && pair.b === activeCell.a))
      ) ?? null)
    : null

  const evidence = activeCell
    ? model.evidence.find(
        (row) =>
          (row.a === activeCell.a && row.b === activeCell.b) ||
          (row.a === activeCell.b && row.b === activeCell.a)
      )
    : null

  return (
    <div className="space-y-8">
      <nav aria-label="Inspect first" className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Inspect first</p>
        <div className="flex flex-wrap gap-1.5">
          {featured.map((entry) => {
            const entryKey = explorerKey(entry.lineId, entry.station.id)
            const active = entryKey === key
            return (
              <button
                key={entryKey}
                type="button"
                onClick={() => handleSelectJunction(entry)}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "cursor-pointer border border-border px-2 py-1 text-xs",
                  active ? "bg-foreground text-background" : "text-foreground hover:bg-muted"
                )}
              >
                {short(entry.station.name)}
              </button>
            )
          })}
        </div>
      </nav>

      <label className="block space-y-1 text-sm">
        <span className="text-muted-foreground">Junction</span>
        <select
          className="w-full max-w-xl border border-border bg-background px-2 py-1.5 text-sm text-foreground"
          value={key}
          onChange={(event) => {
            const next = byKey.get(event.target.value)
            if (next) handleSelectJunction(next)
          }}
        >
          {models.map((entry) => (
            <option key={explorerKey(entry.lineId, entry.station.id)} value={explorerKey(entry.lineId, entry.station.id)}>
              {short(entry.station.name)} · {entry.lineName} · deg {entry.neighbours.length} ·{" "}
              {entry.candidates.length} candidate{entry.candidates.length === 1 ? "" : "s"}
            </option>
          ))}
        </select>
      </label>

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-medium text-foreground">{short(model.station.name)}</h2>
          <LineBadge lineId={model.lineId} diagram={model.lineId === "cable-car"} />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="cursor-pointer border border-border px-2 py-1 text-sm text-foreground hover:bg-muted disabled:opacity-40"
            onClick={() => handleStep(-1)}
            disabled={model.candidates.length <= 1}
            aria-label="Previous candidate"
          >
            Previous
          </button>
          <p className="min-w-32 text-center text-sm text-foreground" aria-live="polite">
            Candidate {index + 1} of {Math.max(1, model.candidates.length)}
          </p>
          <button
            type="button"
            className="cursor-pointer border border-border px-2 py-1 text-sm text-foreground hover:bg-muted disabled:opacity-40"
            onClick={() => handleStep(1)}
            disabled={model.candidates.length <= 1}
            aria-label="Next candidate"
          >
            Next
          </button>
        </div>
      </header>

      {candidate ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="space-y-3 border border-border p-3" aria-labelledby="tree-heading">
            <h3 id="tree-heading" className="text-sm font-medium text-foreground">
              Candidate tree
            </h3>
            <CandidateTreeSvg
              lineId={model.lineId}
              candidate={candidate}
              boundaryOrder={model.boundaryOrder}
              labels={names}
              highlight={highlight}
            />
            {highlight && !highlight.permitted ? (
              <p className="text-xs text-destructive">
                {highlight.pathNodeIds.length > 0
                  ? "This pair has a track path, but an internal turn forbids it."
                  : "No track path between these boundaries — they sit on separate bonded components."}
              </p>
            ) : null}
            {candidate.tree.forbiddenTurns.length > 0 ? (
              <p className="text-xs text-muted-foreground">
                {candidate.tree.forbiddenTurns.length === 1
                  ? "1 internal turn forbidden so the tree does not invent extra movements."
                  : `${candidate.tree.forbiddenTurns.length} internal turns forbidden so the tree does not invent extra movements.`}
              </p>
            ) : null}
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-muted-foreground sm:grid-cols-3">
              <div>
                <dt>Station vertices</dt>
                <dd className="text-foreground">{candidate.stats.stationVertices}</dd>
              </div>
              <div>
                <dt>Anonymous junctions</dt>
                <dd className="text-foreground">{candidate.stats.anonymousJunctions}</dd>
              </div>
              <div>
                <dt>Max degree</dt>
                <dd className="text-foreground">{candidate.stats.maxDegree}</dd>
              </div>
              <div>
                <dt>Track edges</dt>
                <dd className="text-foreground">{candidate.stats.trackEdges}</dd>
              </div>
              <div>
                <dt>Passenger bonds</dt>
                <dd className="text-foreground">{candidate.stats.bonds}</dd>
              </div>
              <div>
                <dt>Movement</dt>
                <dd className="text-foreground">
                  {candidate.comparison.exact
                    ? "Exact match"
                    : `${candidate.comparison.missing} missing / ${candidate.comparison.extra} extra`}
                </dd>
              </div>
              <div>
                <dt>Nearby hub</dt>
                <dd className="text-foreground">
                  {candidate.stats.nearbyHubAffectsLayout ? "Will affect later choice" : "No"}
                </dd>
              </div>
              <div>
                <dt>TfL data</dt>
                <dd className="text-foreground">
                  {candidate.stats.tflDataSupports ? "Supports this tree" : "Does not match sequences"}
                </dd>
              </div>
            </dl>
            {candidate.coupledLayoutNote ? (
              <p className="text-xs text-muted-foreground">{candidate.coupledLayoutNote}</p>
            ) : null}
          </section>

          <section className="space-y-3 border border-border p-3" aria-labelledby="matrix-heading">
            <h3 id="matrix-heading" className="text-sm font-medium text-foreground">
              Reconstructed movement matrix
            </h3>
            <CandidateMatrix
              comparison={candidate.comparison}
              names={names}
              active={activeCell}
              onHover={setHovered}
              onSelect={setSelected}
            />
            <div className="space-y-1 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Source evidence</p>
              {activeCell && evidence && evidence.sequences.length > 0 ? (
                <ul className="list-disc space-y-0.5 pl-4">
                  {evidence.sequences.map((sequence) => (
                    <li key={`${sequence.label}-${sequence.direction}`}>
                      {sequence.label} ({sequence.direction === "a-then-b" ? "A→B" : "B→A"})
                    </li>
                  ))}
                </ul>
              ) : (
                <p>
                  {activeCell
                    ? "No TfL Route/Sequence triple for this pair."
                    : "Select a source-permitted cell to see the ordered sequences that justify it."}
                </p>
              )}
            </div>
          </section>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No candidate within the search bound.</p>
      )}

      {candidate ? (
        <section className="space-y-2" aria-labelledby="branch-heading">
          <h3 id="branch-heading" className="text-sm font-medium text-foreground">
            Branch descriptions
          </h3>
          <p className="text-xs text-muted-foreground">
            Recorded for later scoring. Not used to choose a candidate here.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-max border-collapse text-xs">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="border border-border px-2 py-1">Boundary</th>
                  <th className="border border-border px-2 py-1">Downstream</th>
                  <th className="border border-border px-2 py-1">Length</th>
                  <th className="border border-border px-2 py-1">Terminus</th>
                  <th className="border border-border px-2 py-1">Later junctions</th>
                  <th className="border border-border px-2 py-1">Patterns</th>
                  <th className="border border-border px-2 py-1">Bearing</th>
                  <th className="border border-border px-2 py-1">Hubs</th>
                </tr>
              </thead>
              <tbody>
                {candidate.branches.map((branch) => (
                  <tr key={branch.leafId}>
                    <td className="border border-border px-2 py-1">
                      {names.get(branch.leafId) ?? short(branch.leafName)}
                    </td>
                    <td className="border border-border px-2 py-1 tabular-nums">
                      {branch.downstreamStationCount}
                    </td>
                    <td className="border border-border px-2 py-1 tabular-nums">
                      {branch.distanceM != null ? `${Math.round(branch.distanceM)} m` : "—"}
                    </td>
                    <td className="border border-border px-2 py-1">{branch.isTerminus ? "Yes" : "No"}</td>
                    <td className="border border-border px-2 py-1 tabular-nums">
                      {branch.laterJunctionCount}
                    </td>
                    <td className="border border-border px-2 py-1 tabular-nums">
                      {branch.servicePatternCount}
                    </td>
                    <td className="border border-border px-2 py-1 tabular-nums">
                      {branch.bearingDeg != null ? `${Math.round(branch.bearingDeg)}°` : "—"}
                    </td>
                    <td className="border border-border px-2 py-1">
                      {branch.hubIds.length > 0 ? branch.hubIds.join(", ") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  )
}
