/**
 * A finite grammar for describing rail junctions independently of any one
 * renderer (geographic map, force-field graph, branched-line diagram).
 *
 * The core idea: geometry does not imply connectivity. A three-way "Y" only
 * tells you three physical legs meet at a point — it says nothing about
 * whether trains can actually move between every pair of legs. So the
 * model separates:
 *
 *   - legs           the physical arms meeting at (or crossing at) the junction
 *   - movements      which incoming leg → outgoing leg pairs are actually used
 *   - type           a closed taxonomy of the *shapes* that occur on TfL rail
 *
 * Renderers read `legs` + `movements`; they must not invent connectivity
 * that isn't declared here, and they may each simplify the same junction
 * differently (see `docs/coding-style.md` composition contract).
 *
 * Terminology follows UK railway usage where an established term exists
 * (trailing/facing junction, flying junction, wye, ladder) rather than
 * inventing new names; `JUNCTION_TYPES` documents the closest term per type.
 */

export type LegId = string

export type Leg = {
  id: LegId
  label: string
  /** Compass-style bearing from the junction, degrees clockwise from north. Seeds force-field/geo layout only — not a hard constraint. */
  bearingDeg: number
  /** True when this leg is a physical dead end beyond the junction (a spur), not a continuation into more network. */
  terminal?: boolean
}

export type Movement = {
  from: LegId
  to: LegId
  /**
   * True when this movement is realised by a ramp/flyover/dive-under so it
   * never conflicts with opposing traffic at grade. Grade separation is a
   * property of *how* a movement is built, not a different connectivity
   * algebra — see `grade-separated` in `JUNCTION_TYPES`.
   */
  gradeSeparated?: boolean
}

export const JUNCTION_TYPE_IDS = [
  "linear",
  "y-junction",
  "through-fork",
  "merge",
  "crossing",
  "flat-junction",
  "diamond",
  "wye",
  "loop",
  "spur",
  "multi-branch",
  "grade-separated",
] as const

export type JunctionTypeId = (typeof JUNCTION_TYPE_IDS)[number]

export type JunctionTypeInfo = {
  id: JunctionTypeId
  name: string
  shape: string
  meaning: string
  minLegs: number
  /** Closest established railway/graph term, when this isn't already it. */
  establishedTerm?: string
}

export const JUNCTION_TYPES: Record<JunctionTypeId, JunctionTypeInfo> = {
  linear: {
    id: "linear",
    name: "Linear",
    shape: "A─B─C",
    meaning:
      "Normal continuation; not a junction at all — the baseline every other type is judged against.",
    minLegs: 2,
  },
  "y-junction": {
    id: "y-junction",
    name: "Terminal branch / Y-junction",
    shape: "A─J─B, J─C",
    meaning:
      "A↔B and A↔C are valid; B↔C may not be. One leg reads as the operational branch off a through route.",
    minLegs: 3,
    establishedTerm:
      "trailing junction (or facing junction, by direction of travel)",
  },
  "through-fork": {
    id: "through-fork",
    name: "Through fork",
    shape: "A─J─B/C",
    meaning:
      "One incoming route divides into two onward routes that are both 'primary', not a trunk-plus-branch.",
    minLegs: 3,
    establishedTerm: "facing junction",
  },
  merge: {
    id: "merge",
    name: "Merge",
    shape: "A/B─J─C",
    meaning:
      "Two service paths converge onto one outgoing leg — a fork viewed in the converging direction.",
    minLegs: 3,
    establishedTerm: "converging junction",
  },
  crossing: {
    id: "crossing",
    name: "Crossing",
    shape: "──┼──",
    meaning:
      "Physical lines cross in plan but share no track connection at all — no node, no movement.",
    minLegs: 4,
    establishedTerm: "diamond crossing (unconnected)",
  },
  "flat-junction": {
    id: "flat-junction",
    name: "Flat junction / connected crossing",
    shape: "──╋──",
    meaning:
      "Multiple approaches are physically connected, but only a defined subset of movements is permitted.",
    minLegs: 4,
    establishedTerm: "flat junction",
  },
  diamond: {
    id: "diamond",
    name: "Diamond / four-way junction",
    shape: "4 approaches",
    meaning:
      "Through and turning movements are both possible; connectivity must be stated explicitly, not assumed from the shape.",
    minLegs: 4,
    establishedTerm: "double junction / diamond junction",
  },
  wye: {
    id: "wye",
    name: "Wye / triangular junction",
    shape: "△",
    meaning:
      "Three legs where every pairwise movement is possible, including reversal moves not used in passenger service.",
    minLegs: 3,
    establishedTerm: "wye (triangular junction)",
  },
  loop: {
    id: "loop",
    name: "Loop",
    shape: "branch leaves and rejoins",
    meaning:
      "A route diverges and later reconnects to the same route further along — one physical circuit, not a dead end.",
    minLegs: 3,
  },
  spur: {
    id: "spur",
    name: "Spur",
    shape: "──┬─X",
    meaning:
      "A branch terminates rather than reconnecting; the far leg is a physical dead end, not just an unused movement.",
    minLegs: 3,
  },
  "multi-branch": {
    id: "multi-branch",
    name: "Multi-branch junction",
    shape: "3+ outgoing legs",
    meaning:
      "Generalisation of the wye/fork family to more legs than any single named shape covers.",
    minLegs: 4,
    establishedTerm: "ladder junction (when legs fan out in sequence)",
  },
  "grade-separated": {
    id: "grade-separated",
    name: "Grade-separated junction",
    shape: "overlapping paths",
    meaning:
      "Routes cross geographically, but at least one movement is realised by a ramp/tunnel rather than a flat, conflicting merge.",
    minLegs: 3,
    establishedTerm: "flying junction / burrowing junction",
  },
}

export type Junction = {
  id: string
  type: JunctionTypeId
  label: string
  legs: Leg[]
  /** Directed incoming-leg → outgoing-leg pairs actually used. Omit a pair to declare it impassable, even if geometry suggests otherwise. */
  movements: Movement[]
  /** Loop-specific: the leg the loop rejoins onto, forming one circuit rather than two independent junctions. */
  rejoinsLegId?: LegId
  notes?: string
  londonExamples?: string[]
}

export const legIds = (junction: Junction): LegId[] =>
  junction.legs.map((leg) => leg.id)

export const legById = (junction: Junction, id: LegId): Leg | undefined =>
  junction.legs.find((leg) => leg.id === id)

export const canMove = (junction: Junction, from: LegId, to: LegId): boolean =>
  junction.movements.some(
    (movement) => movement.from === from && movement.to === to
  )

/** Unordered leg pairs with at least one permitted direction of movement. */
export const connectedLegPairs = (junction: Junction): [LegId, LegId][] => {
  const seen = new Set<string>()
  const pairs: [LegId, LegId][] = []
  for (const movement of junction.movements) {
    const [a, b] = [movement.from, movement.to].sort()
    const key = `${a}|${b}`
    if (seen.has(key)) continue
    seen.add(key)
    pairs.push([a!, b!])
  }
  return pairs
}

export const isFullyConnected = (junction: Junction): boolean => {
  const legCount = junction.legs.length
  const possiblePairs = (legCount * (legCount - 1)) / 2
  return connectedLegPairs(junction).length >= possiblePairs
}

/** Symmetric permitted-movement pairs (most rail movements work both ways). */
export const symmetricMovements = (
  pairs: readonly [LegId, LegId][]
): Movement[] =>
  pairs.flatMap(([a, b]) => [
    { from: a, to: b },
    { from: b, to: a },
  ])

export const validateJunction = (junction: Junction): string[] => {
  const problems: string[] = []
  const info = JUNCTION_TYPES[junction.type]
  const ids = new Set(legIds(junction))

  if (junction.legs.length < info.minLegs) {
    problems.push(
      `${junction.id}: ${info.name} needs at least ${info.minLegs} legs, has ${junction.legs.length}`
    )
  }
  if (ids.size !== junction.legs.length) {
    problems.push(`${junction.id}: duplicate leg ids`)
  }
  for (const movement of junction.movements) {
    if (!ids.has(movement.from)) {
      problems.push(
        `${junction.id}: movement references unknown leg "${movement.from}"`
      )
    }
    if (!ids.has(movement.to)) {
      problems.push(
        `${junction.id}: movement references unknown leg "${movement.to}"`
      )
    }
    if (movement.from === movement.to) {
      problems.push(
        `${junction.id}: movement from "${movement.from}" to itself`
      )
    }
  }
  if (junction.type === "crossing" && junction.movements.length > 0) {
    problems.push(
      `${junction.id}: crossing must have zero movements (no connection)`
    )
  }
  if (junction.rejoinsLegId && !ids.has(junction.rejoinsLegId)) {
    problems.push(
      `${junction.id}: rejoinsLegId references unknown leg "${junction.rejoinsLegId}"`
    )
  }
  for (const leg of junction.legs) {
    const usesLeg = junction.movements.some(
      (m) => m.from === leg.id || m.to === leg.id
    )
    if (junction.type !== "crossing" && !usesLeg && junction.legs.length > 1) {
      problems.push(
        `${junction.id}: leg "${leg.id}" has no permitted movement at all`
      )
    }
  }
  return problems
}
