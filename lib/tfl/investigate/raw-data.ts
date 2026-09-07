/**
 * Raw TfL Route/Sequence access for the "Drawing the line" investigation.
 *
 * `LINE_STATION_SEQUENCES` is tfl-ts's compiled copy of
 * `GET /Line/{id}/Route/Sequence/{direction}` (see tfl-ts
 * `script/generateStationSequences.ts`). It is read here directly from
 * `tfl-ts`, not through `lib/tfl/line-topology.ts`, so this investigation
 * does not inherit that file's graph-building decisions.
 */

import {
  LINE_STATION_SEQUENCES,
  STATION_HUB_LIST,
  STATION_SEQUENCES_GENERATED_AT,
} from "tfl-ts"
import type { HubMembership } from "./types"

export type RawStation = { id: string; name: string }

export type RawBranch = {
  id: number
  direction: "inbound" | "outbound"
  serviceType: string
  nextBranchIds: number[]
  previousBranchIds: number[]
  stationIds: string[]
}

export type RawOrderedRoute = {
  name: string
  direction: "inbound" | "outbound"
  serviceType: string
  stationIds: string[]
}

export type RawLineSequence = {
  lineId: string
  lineName: string
  modeName: string
  stations: RawStation[]
  branches: RawBranch[]
  orderedRoutes: RawOrderedRoute[]
}

const SEQUENCES = LINE_STATION_SEQUENCES as unknown as Record<
  string,
  RawLineSequence | undefined
>

/** Lines the write-up calls out as the primary stress cases. */
export const PRIMARY_LINE_IDS = [
  "dlr",
  "northern",
  "elizabeth",
  "circle",
  "central",
  "district",
] as const

/** Every line with a cached Route/Sequence, primary stress cases first. */
export const INVESTIGATION_LINE_IDS: readonly string[] = (() => {
  const all = Object.keys(SEQUENCES)
  const primarySet = new Set<string>(PRIMARY_LINE_IDS)
  const primary = PRIMARY_LINE_IDS.filter((id) => all.includes(id))
  const rest = all.filter((id) => !primarySet.has(id)).sort((a, b) => a.localeCompare(b))
  return [...primary, ...rest]
})()

export const getRawSequence = (lineId: string): RawLineSequence | null =>
  SEQUENCES[lineId] ?? null

/** All station-id sequences (ordered routes + branches) — the sole adjacency evidence. */
export const getEvidenceSequences = (sequence: RawLineSequence): string[][] => [
  ...sequence.orderedRoutes.map((route) => route.stationIds),
  ...sequence.branches.map((branch) => branch.stationIds),
]

export type NamedEvidenceSequence = {
  label: string
  stationIds: string[]
}

export const getNamedEvidenceSequences = (sequence: RawLineSequence): NamedEvidenceSequence[] => [
  ...sequence.orderedRoutes.map((route) => ({
    label: route.name || `${route.direction} ${route.serviceType}`,
    stationIds: route.stationIds,
  })),
  ...sequence.branches.map((branch) => ({
    label: `Branch ${branch.id} ${branch.direction}`,
    stationIds: branch.stationIds,
  })),
]

export const SEQUENCE_SOURCE_LABEL = `TfL Route/Sequence (tfl-ts snapshot, generated ${STATION_SEQUENCES_GENERATED_AT})`

let hubIndex: Map<string, HubMembership> | null = null

const buildHubIndex = (): Map<string, HubMembership> => {
  const index = new Map<string, HubMembership>()
  for (const hub of STATION_HUB_LIST) {
    if (!hub.hubId || !hub.hubName) continue
    const memberIds = hub.members.map((member) => member.id)
    const membership: HubMembership = {
      hubId: hub.hubId,
      hubName: hub.hubName,
      memberIds,
    }
    for (const id of memberIds) index.set(id, membership)
  }
  return index
}

/** Cross-reference only — TfL hub grouping is informational here, not a topology input. */
export const getHubMembership = (stationId: string): HubMembership | null => {
  if (!hubIndex) hubIndex = buildHubIndex()
  return hubIndex.get(stationId) ?? null
}
