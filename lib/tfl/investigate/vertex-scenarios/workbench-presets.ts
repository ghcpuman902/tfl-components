import type { DirectedMatrix, PortId } from "./types"
import { PORT_LABELS } from "./types"
import { patternMatrix } from "./pattern"
import type { JunctionReport } from "../types"

export type WorkbenchPreset = {
  id: string
  title: string
  note: string
  matrix: DirectedMatrix
  armNames?: Partial<Record<PortId, string>>
}

const shared: DirectedMatrix = {
  ports: ["A", "B", "C", "D", "E"],
  moves: (["A", "B"] as PortId[]).flatMap((from) =>
    (["C", "D", "E"] as PortId[]).flatMap((to) => [
      { from, to },
      { from: to, to: from },
    ])
  ),
}

export const WORKBENCH_PRESETS: WorkbenchPreset[] = [
  {
    id: "through-terminus",
    title: "3 arms · Through + terminus",
    note: "A and B continue through S. C reaches the same station but has no through-movement to either arm.",
    matrix: patternMatrix("through-terminus"),
  },
  {
    id: "y",
    title: "3 arms · A Y",
    note: "B and C share A as their continuation. Sharing the stem must not introduce B ↔ C.",
    matrix: patternMatrix("y"),
  },
  {
    id: "triangle",
    title: "3 arms · Every pair",
    note: "All three pairs are allowed. One Y cannot express this: whichever arm becomes the stem, its two branches still need their own through-passage.",
    matrix: patternMatrix("triangle"),
  },
  {
    id: "corridors",
    title: "4 arms · Independent corridors",
    note: "A ↔ B and C ↔ D share the station name. The link between their markers is an interchange.",
    matrix: patternMatrix("independent-corridors"),
  },
  {
    id: "shared-five",
    title: "5 arms · Two groups share a segment",
    note: "Every arm in A, B reaches every arm in C, D, E, in both directions. A shared segment with forks at both ends can express all six pairs. The complete two-group arrangement a photograph of a five-arm station would suggest.",
    matrix: shared,
  },
  {
    id: "missing-one",
    title: "5 arms · One permission removed",
    note: "B ↔ E is removed from the previous case — the recorded-services snapshot. Keeping the whole shared segment would silently put that movement back.",
    matrix: {
      ...shared,
      moves: shared.moves.filter(
        (move) =>
          !(
            (move.from === "B" && move.to === "E") ||
            (move.from === "E" && move.to === "B")
          )
      ),
    },
  },
]

/** Preserve the neighbour-to-letter mapping; canonicalisation would rotate
 * the matrix without also rotating the real station names.
 */
export const presetFromJunction = (
  junction: JunctionReport
): WorkbenchPreset => {
  const ports = PORT_LABELS.slice(0, junction.neighbours.length)
  const labels = new Map(
    junction.neighbours.map((arm, i) => [arm.id, ports[i]!])
  )
  return {
    id: "earls-court",
    title: "5 arms · Earl's Court · District",
    note: "From the repository's TfL Route/Sequence snapshot. An empty cell means no movement was observed in those sequences, not proof that no service ever runs. Editing makes this a hypothetical matrix.",
    armNames: Object.fromEntries(
      junction.neighbours.map((arm, i) => [
        ports[i],
        arm.name.replace(/ Underground Station$/, ""),
      ])
    ),
    matrix: {
      ports,
      moves: junction.matrix.flatMap((pair) => {
        const a = labels.get(pair.a.id)!
        const b = labels.get(pair.b.id)!
        return [
          ...(pair.aThenB > 0 ? [{ from: a, to: b }] : []),
          ...(pair.bThenA > 0 ? [{ from: b, to: a }] : []),
        ]
      }),
    },
  }
}
