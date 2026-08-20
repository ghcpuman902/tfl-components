/**
 * Render-ready strip models and pure preparation helpers.
 *
 * Atoms (`StraightStrip`, `BranchStrip`) only render these contracts.
 * TfL-aware adjacency, closures, colours, and label recipes live in
 * `LineStrip` / callers that invoke these helpers.
 */

import type {
  DiagramSegment,
  DiagramSegmentState,
  DiagramStation,
} from "./diagram-station"
import { getHorizontalStationLabelOverride } from "./horizontal-station-labels"
import type { LineSchematic } from "./line-schematic"

export type StripSegmentState = DiagramSegmentState

/** Atomic straight-strip station: display fields only, no TfL lookup. */
export type StraightStripStation = DiagramStation & {
  /**
   * Editorial visual line breaks prepared by the molecule.
   * When omitted, StationName uses a single canonical line.
   */
  labelLines?: readonly string[]
}

export type StripLabelPlacement = "above" | "below" | "alternate"

export type PreparedStraightStrip = {
  stations: StraightStripStation[]
  segmentStates: StripSegmentState[]
  stationOutOfUse: boolean[]
}

export type BranchStripLabelMap = Readonly<
  Record<string, readonly string[] | undefined>
>

export type PreparedBranchStrip = {
  schematic: LineSchematic
  /** Per schematic node id → editorial visual lines. */
  nodeLabelLines: BranchStripLabelMap
  /** Optional edge overrides keyed `"fromId→toId"`. */
  segmentStates?: Readonly<Record<string, StripSegmentState>>
}

const segmentKey = (fromId: string, toId: string) => `${fromId}→${toId}`

export const buildSegmentStateMap = (
  stations: readonly Pick<DiagramStation, "id">[],
  segments: readonly DiagramSegment[] | undefined
): StripSegmentState[] => {
  const override = new Map<string, StripSegmentState>()
  for (const segment of segments ?? []) {
    override.set(
      segmentKey(segment.fromStationId, segment.toStationId),
      segment.state
    )
  }
  const states: StripSegmentState[] = []
  for (let i = 0; i < stations.length - 1; i += 1) {
    const from = stations[i]!
    const to = stations[i + 1]!
    states.push(override.get(segmentKey(from.id, to.id)) ?? "normal")
  }
  return states
}

/** True when station index touches an out-of-use segment (legacy / touch rule). */
export const isStationOutOfUse = (
  index: number,
  segmentStates: readonly StripSegmentState[]
): boolean => {
  const leftClosed = index > 0 && segmentStates[index - 1] === "out-of-use"
  const rightClosed =
    index < segmentStates.length && segmentStates[index] === "out-of-use"
  return leftClosed || rightClosed
}

/**
 * Derive which stations to grey from segment states.
 *
 * A station is out-of-use only when **every** adjacent spine segment is
 * out-of-use:
 * - Queen’s Park (one open side + one closed) → stays open
 * - Harrow & Wealdstone terminal (only segment closed) → closed
 * - Interiors of a closed stretch (both sides closed) → closed
 * - Full-line mute → every station closed
 */
export const stationOutOfUseFromSegments = (
  stationCount: number,
  segmentStates: readonly StripSegmentState[]
): boolean[] => {
  const out = new Array(stationCount).fill(false)
  if (stationCount === 0) return out

  for (let i = 0; i < stationCount; i += 1) {
    const hasLeft = i > 0
    const hasRight = i < segmentStates.length
    if (!hasLeft && !hasRight) continue

    const leftClosed = hasLeft && segmentStates[i - 1] === "out-of-use"
    const rightClosed = hasRight && segmentStates[i] === "out-of-use"

    if (hasLeft && hasRight) {
      out[i] = leftClosed && rightClosed
    } else if (hasLeft) {
      out[i] = leftClosed
    } else {
      out[i] = rightClosed
    }
  }

  return out
}

/** Apply strip label recipes to domain stations (TfL-aware preparation). */
export const applyStripLabelRecipes = (
  stations: readonly DiagramStation[]
): StraightStripStation[] =>
  stations.map((station) => {
    const recipe = getHorizontalStationLabelOverride(station.name, station.id)
    if (!recipe?.lines) return { ...station }
    return { ...station, labelLines: recipe.lines }
  })

/**
 * Prepare a straight-strip render model from domain stations + optional
 * closure segments / explicit out-of-use ids.
 */
export const prepareStraightStrip = (
  stations: readonly DiagramStation[],
  options: {
    segments?: readonly DiagramSegment[]
    stationOutOfUseIds?: readonly string[]
    /** When false, skip editorial recipes (caller already set labelLines). */
    applyLabelRecipes?: boolean
  } = {}
): PreparedStraightStrip => {
  const withLabels =
    options.applyLabelRecipes === false
      ? stations.map((s) => ({ ...s }) as StraightStripStation)
      : applyStripLabelRecipes(stations)

  const segmentStates = buildSegmentStateMap(withLabels, options.segments)
  const stationOutOfUse =
    options.stationOutOfUseIds != null
      ? withLabels.map((s) => options.stationOutOfUseIds!.includes(s.id))
      : stationOutOfUseFromSegments(withLabels.length, segmentStates)

  return { stations: withLabels, segmentStates, stationOutOfUse }
}

/** Apply strip label recipes to every schematic node (by node id). */
export const prepareBranchStripLabels = (
  schematic: LineSchematic
): BranchStripLabelMap => {
  const map: Record<string, readonly string[] | undefined> = {}
  for (const node of schematic.nodes) {
    const recipe = getHorizontalStationLabelOverride(
      node.name,
      node.stationKey ?? node.id
    )
    map[node.id] = recipe?.lines
  }
  return map
}

export const prepareBranchStrip = (
  schematic: LineSchematic,
  options: {
    segmentStates?: Readonly<Record<string, StripSegmentState>>
    applyLabelRecipes?: boolean
    nodeLabelLines?: BranchStripLabelMap
  } = {}
): PreparedBranchStrip => ({
  schematic,
  nodeLabelLines:
    options.nodeLabelLines ??
    (options.applyLabelRecipes === false
      ? {}
      : prepareBranchStripLabels(schematic)),
  segmentStates: options.segmentStates,
})

export const branchSegmentKey = segmentKey
