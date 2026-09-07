/**
 * Diagnostic types for the "Drawing the line" investigation.
 *
 * This module is deliberately independent of `lib/tfl/line-topology.ts`,
 * `lib/tfl/branch-schematic-layout.ts`, and `lib/tfl/geometry/*topology*`.
 * It derives its own passenger graph, movement matrix, and decomposition
 * straight from raw TfL Route/Sequence data (see `raw-data.ts`), so the
 * results can be compared against the existing implementation rather than
 * inherited from it. Station coordinates seed arm bearings only — they
 * never create or remove edges.
 */

export type StationRef = {
  id: string
  name: string
}

/** A neighbour of a catalogued station, with enough context to draw past it. */
export type NeighbourRef = StationRef & {
  degree: number
  /** Far-side station when this neighbour itself is degree 2. */
  beyond: StationRef | null
  /** Compass bearing from the junction, degrees clockwise from north. */
  bearingDeg: number | null
  /** Great-circle distance from the junction in metres. */
  distanceM: number | null
}

/** Dominant compass axis at a junction, from the neighbours' bearings. */
export type CompassAxis = "NS" | "EW"

export type SameDirectionPair = {
  a: StationRef
  b: StationRef
  gapDeg: number
}

/**
 * How incident edges sit around a junction in space — a drawing constraint,
 * not extra topology. Coordinates never create or remove edges.
 */
/** One independent through-pair at a shared station name. */
export type ThroughCorridor = {
  /** Drawn toward north / the axis-forward end. */
  a: NeighbourRef
  /** Drawn toward south / the opposite end. */
  b: NeighbourRef
  evidenceCount: number
}

export type JunctionOrientation = {
  axis: CompassAxis
  /** Neighbours in clockwise geographic order, closest-to-north first. */
  orderBasis: "geographic-bearing" | "unknown"
  /**
   * True when a circular order that only minimises permitted-pair crossings
   * would interleave opposite sides of `axis` (N–S–N–S / W–E–W–E).
   */
  crossingMinAlternatesSides: boolean
  /** Neighbour pairs whose bearings are closer than the same-direction threshold. */
  sameDirectionPairs: SameDirectionPair[]
}

/** Provenance tag so every derived fact can be traced to its source. */
export type Evidence = "tfl-route-sequence" | "tfl-station-hub" | "derived"

export type MovementPair = {
  a: StationRef
  b: StationRef
  /** Sequences running `a → station → b`. */
  aThenB: number
  /** Sequences running `b → station → a`. */
  bThenA: number
  /** Either direction is evidenced. */
  supported: boolean
  /** `aThenB + bThenA`. */
  evidenceCount: number
}

export type JunctionArchetype =
  | "ordinary-y"
  | "through-y"
  | "triangle-junction"
  | "isolated-degree-3"
  | "independent-corridors"
  | "chained-junction"
  | "non-through-degree-2"
  | "complex"

export type DecompositionNode =
  | {
      kind: "leaf"
      neighbourId: string
      neighbourName: string
    }
  | {
      kind: "join"
      id: string
      evidenceCount: number
      left: DecompositionNode
      right: DecompositionNode
    }

export type JunctionReport = {
  station: StationRef
  degree: number
  neighbours: NeighbourRef[]
  matrix: MovementPair[]
  unsupportedPairCount: number
  archetype: JunctionArchetype
  /** Present only when degree > 3 and a candidate exists. */
  decomposition: DecompositionNode | null
  /** Connected components of the movement graph over incident edges. */
  movementComponents: StationRef[][]
  /** 2-neighbour through-pairs when the movement graph splits. */
  corridors: ThroughCorridor[]
  /** Isolated incident edges — services that start or end here. */
  stubs: NeighbourRef[]
  hub: HubMembership | null
  orientation: JunctionOrientation | null
  /** Drawing-conversion observations — not data errors. */
  conversionNotes: string[]
  warnings: string[]
  evidence: Evidence
}

export type HubMembership = {
  hubId: string
  hubName: string
  /** Other StopPoint ids in the same TfL hub, across all modes. */
  memberIds: string[]
}

export type PatternRelation =
  | "dominant"
  | "shared-corridor-subset"
  | "different-terminus"
  | "skip-variant"
  | "unrelated"

export type ServicePatternReport = {
  key: string
  label: string
  direction: "inbound" | "outbound"
  stationSequence: StationRef[]
  isDominant: boolean
  relation: PatternRelation
  /** Stations another related pattern serves between two shared stations that this one skips. */
  skips: StationRef[]
  note: string
}

export type LineFindings = {
  totalStations: number
  trivialStationCount: number
  junctionCount: number
  archetypeCounts: Partial<Record<JunctionArchetype, number>>
  expansionCandidateCount: number
  splitCandidateCount: number
  patternCount: number
  irregularPatternCount: number
  skipPatternCount: number
  orientationConflictCount: number
  sameDirectionPairCount: number
  warnings: string[]
}

export type LineAnalysis = {
  lineId: string
  lineName: string
  modeName: string
  totalStations: number
  junctions: JunctionReport[]
  patterns: ServicePatternReport[]
  findings: LineFindings
}

/** One junction as it appears in the cross-line catalogue. */
export type CataloguedJunction = {
  lineId: string
  lineName: string
  junction: JunctionReport
}

export type JunctionCatalogGroup = {
  degree: number
  archetype: JunctionArchetype
  title: string
  items: CataloguedJunction[]
}
