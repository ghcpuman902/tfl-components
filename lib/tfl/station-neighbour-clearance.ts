/**
 * Diagnostic-only: how much clear space sits between two *adjacent* station
 * labels once each is independently wrapped/abbreviated/scaled to fit its
 * own pitch box.
 *
 * `StationName` / `formatStationLabel` only ever check a station's own box —
 * neither knows a neighbour exists. This models what production strips
 * actually do today (each label centred in an equal-width box, `pitchPx`
 * apart) so real names can be measured for real crowding before deciding
 * whether neighbour-aware wrapping belongs in the production algorithm.
 * Exploration for the temp page at `/temp/station-neighbour-clearance` —
 * not wired into any production strip.
 */

import {
  approximateStationMeasure,
  formatStationLabel,
  type StationTextMeasure,
} from "@/lib/tfl/station-typography"

export type NeighbourLabelDiagnostic = {
  name: string
  displayName: string
  lines: string[]
  scale: number
  abbreviated: boolean
  /** True when the label fit its own box in isolation (no neighbour check). */
  fitsOwnBox: boolean
  /** Widest rendered line, in px, at the resolved scale. */
  widthPx: number
}

export type NeighbourClearanceResult = {
  a: NeighbourLabelDiagnostic
  b: NeighbourLabelDiagnostic
  /** Centre-to-centre pitch shared by both boxes. */
  pitchPx: number
  fontSizePx: number
  /** Estimated clear space between the two rendered labels. Negative = overlap. */
  gapPx: number
  gapEm: number
  minClearanceEm: number
  /** True when `gapEm` meets `minClearanceEm`. */
  clears: boolean
}

export type NeighbourClearanceOptions = {
  fontSizePx: number
  maxLines?: 1 | 2
  allowAbbreviation?: boolean
  /** Production diagram labels never scale down today — default false. */
  allowScaleDown?: boolean
  minClearanceEm?: number
  measure?: StationTextMeasure
  /**
   * Experimental: instead of letting each label wrap/abbreviate against the
   * *full* pitch (today's behaviour — "fits" is checked before a neighbour
   * could ever matter), pre-shrink each station's own box by half the target
   * clearance so the existing wrap → abbreviate → scale chain "sees" the
   * neighbour requirement as its own fit problem. No new fallback logic —
   * just a smaller box fed into the same `formatStationLabel`.
   */
  reserveClearance?: boolean
}

/** The "1.5 space" breathing room requested for crowded neighbours. */
export const DEFAULT_MIN_NEIGHBOUR_CLEARANCE_EM = 1.5

const diagnoseLabel = (
  name: string,
  pitchPx: number,
  measure: StationTextMeasure,
  options: NeighbourClearanceOptions
): NeighbourLabelDiagnostic => {
  const minClearanceEm =
    options.minClearanceEm ?? DEFAULT_MIN_NEIGHBOUR_CLEARANCE_EM
  const reservedPx = options.reserveClearance
    ? (minClearanceEm * options.fontSizePx) / 2
    : 0
  const ownMaxWidth = Math.max(1, pitchPx - reservedPx)
  const result = formatStationLabel(name, measure, {
    maxWidth: ownMaxWidth,
    fontSize: options.fontSizePx,
    maxLines: options.maxLines ?? 2,
    allowAbbreviation: options.allowAbbreviation ?? false,
    allowScaleDown: options.allowScaleDown ?? false,
  })
  const sizedFont = options.fontSizePx * result.scale
  const widthPx = Math.max(
    ...result.lines.map((line) => measure(line, sizedFont))
  )
  return {
    name,
    displayName: result.displayName,
    lines: result.lines,
    scale: result.scale,
    abbreviated: result.abbreviated,
    fitsOwnBox: result.fits,
    widthPx,
  }
}

/**
 * Estimate clearance between two same-row adjacent labels, each centred in
 * its own `pitchPx`-wide box — how `StraightStrip` columns and horizontal
 * `BranchStrip` labels are actually positioned today.
 */
export const evaluateNeighbourClearance = (
  nameA: string,
  nameB: string,
  pitchPx: number,
  options: NeighbourClearanceOptions
): NeighbourClearanceResult => {
  const measure = options.measure ?? approximateStationMeasure
  const a = diagnoseLabel(nameA, pitchPx, measure, options)
  const b = diagnoseLabel(nameB, pitchPx, measure, options)
  const minClearanceEm =
    options.minClearanceEm ?? DEFAULT_MIN_NEIGHBOUR_CLEARANCE_EM
  const gapPx = pitchPx - (a.widthPx + b.widthPx) / 2
  const gapEm = gapPx / options.fontSizePx
  return {
    a,
    b,
    pitchPx,
    fontSizePx: options.fontSizePx,
    gapPx,
    gapEm,
    minClearanceEm,
    clears: gapEm >= minClearanceEm,
  }
}

export type NeighbourPair = { id: string; name: string }

/**
 * Rank consecutive-station pairs by clearance, worst (smallest / most
 * negative gap) first. Feed real adjacency — a straight-strip order, or a
 * branch schematic's same-lane chain — this makes no adjacency assumptions
 * of its own.
 */
export const rankNeighbourPairs = (
  stations: readonly NeighbourPair[],
  pitchPx: number,
  options: NeighbourClearanceOptions
): NeighbourClearanceResult[] => {
  const results: NeighbourClearanceResult[] = []
  for (let i = 0; i < stations.length - 1; i += 1) {
    const a = stations[i]!
    const b = stations[i + 1]!
    results.push(evaluateNeighbourClearance(a.name, b.name, pitchPx, options))
  }
  return results.sort((x, y) => x.gapEm - y.gapEm)
}
