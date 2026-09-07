/**
 * The simplified drawing is a different graph from the raw star at S.
 *
 * The star keeps every arm on one passenger vertex. The drawing may
 * split S, insert an unlabelled fork, and join those copies with a
 * walking bond. The renderer only sees this graph. Layout policy
 * (primary direction, snap axes) is applied later.
 */

import type { PatternKind } from "./pattern"
import type { PortId } from "./types"

export type DrawingNodeKind = "boundary" | "station" | "fork"

export type DrawingNode = {
  id: string
  kind: DrawingNodeKind
  port?: PortId
}

export type DrawingEdgeKind = "track" | "bond"

export type DrawingEdge = {
  id: string
  a: string
  b: string
  kind: DrawingEdgeKind
}

/** Side of a station a terminus occupies along the primary axis. */
export type TerminusAlong = "start" | "end"

export type DrawingHints = {
  /** Node ids in preferred order along the primary direction. */
  sequence: string[]
  terminusAlong: Partial<Record<PortId, TerminusAlong>>
}

export type DrawingForbiddenTurn = {
  at: string
  from: string
  to: string
}

export type DrawingScene = {
  title: string
  nodes: DrawingNode[]
  edges: DrawingEdge[]
  hints: DrawingHints
  /** Branch reversals that look like a path but are not a through-move. */
  forbiddenTurns: DrawingForbiddenTurn[]
}

const boundary = (port: PortId): DrawingNode => ({
  id: port,
  kind: "boundary",
  port,
})

const station = (id: string): DrawingNode => ({ id, kind: "station" })

const fork = (id: string): DrawingNode => ({ id, kind: "fork" })

const track = (a: string, b: string): DrawingEdge => ({
  id: `track:${a}-${b}`,
  a,
  b,
  kind: "track",
})

const bond = (a: string, b: string): DrawingEdge => ({
  id: `bond:${a}-${b}`,
  a,
  b,
  kind: "bond",
})

const scene = (
  title: string,
  nodes: DrawingNode[],
  edges: DrawingEdge[],
  terminusAlong: Partial<Record<PortId, TerminusAlong>>,
  forbiddenTurns: DrawingForbiddenTurn[] = []
): DrawingScene => ({
  title,
  nodes,
  edges,
  hints: {
    sequence: nodes.map((node) => node.id),
    terminusAlong,
  },
  forbiddenTurns,
})

const throughScene = (): DrawingScene =>
  scene(
    "Through",
    [boundary("A"), station("S"), boundary("B")],
    [track("A", "S"), track("S", "B")],
    { A: "start", B: "end" }
  )

const dualTerminusScene = (sameSide: boolean): DrawingScene =>
  scene(
    sameSide ? "Dual terminus, same side" : "Dual terminus, different sides",
    [boundary("A"), station("S1"), station("S2"), boundary("B")],
    [track("A", "S1"), track("S2", "B"), bond("S1", "S2")],
    { A: "start", B: sameSide ? "start" : "end" }
  )

const yStemScene = (): DrawingScene =>
  scene(
    "Y, stem S",
    [boundary("A"), station("S"), fork("Y"), boundary("B"), boundary("C")],
    [track("A", "S"), track("S", "Y"), track("Y", "B"), track("Y", "C")],
    { A: "start", B: "end", C: "end" },
    [
      { at: "Y", from: "B", to: "C" },
      { at: "Y", from: "C", to: "B" },
    ]
  )

const ySplitScene = (): DrawingScene =>
  scene(
    "Y, split S",
    [
      boundary("A"),
      fork("Y"),
      station("S1"),
      station("S2"),
      boundary("B"),
      boundary("C"),
    ],
    [
      track("A", "Y"),
      track("Y", "S1"),
      track("Y", "S2"),
      track("S1", "B"),
      track("S2", "C"),
      bond("S1", "S2"),
    ],
    { A: "start", B: "end", C: "end" },
    [
      { at: "Y", from: "S1", to: "S2" },
      { at: "Y", from: "S2", to: "S1" },
    ]
  )

const throughTerminusScene = (sameAs: "a" | "b"): DrawingScene =>
  scene(
    sameAs === "a"
      ? "Through plus terminus, C same as A"
      : "Through plus terminus, C same as B",
    [boundary("A"), station("S1"), boundary("B"), station("S2"), boundary("C")],
    [track("A", "S1"), track("S1", "B"), track("S2", "C"), bond("S1", "S2")],
    { A: "start", B: "end", C: sameAs === "a" ? "start" : "end" }
  )

const threeTerminiScene = (sameSide: boolean): DrawingScene =>
  scene(
    sameSide ? "Three termini, same side" : "Three termini, different sides",
    [
      boundary("A"),
      station("S1"),
      boundary("B"),
      station("S2"),
      boundary("C"),
      station("S3"),
    ],
    [
      track("A", "S1"),
      track("S2", "B"),
      track("C", "S3"),
      bond("S1", "S2"),
      bond("S2", "S3"),
    ],
    {
      A: "start",
      B: sameSide ? "start" : "end",
      C: "start",
    }
  )

const independentCorridorsScene = (): DrawingScene =>
  scene(
    "Independent corridors",
    [
      boundary("A"),
      station("S1"),
      boundary("B"),
      boundary("C"),
      station("S2"),
      boundary("D"),
    ],
    [
      track("A", "S1"),
      track("S1", "B"),
      track("C", "S2"),
      track("S2", "D"),
      bond("S1", "S2"),
    ],
    { A: "start", B: "end", C: "start", D: "end" }
  )

/** Topology for a building-block drawing. Null when the pattern is not a tree. */
export const buildDrawingScene = (
  kind: PatternKind,
  variant: string
): DrawingScene | null => {
  if (kind === "through") return throughScene()
  if (kind === "dual-terminus")
    return dualTerminusScene(variant === "same-side")
  if (kind === "y") return variant === "split" ? ySplitScene() : yStemScene()
  if (kind === "through-terminus") {
    return throughTerminusScene(variant === "same-as-b" ? "b" : "a")
  }
  if (kind === "three-termini")
    return threeTerminiScene(variant === "same-side")
  if (kind === "independent-corridors") return independentCorridorsScene()
  return null
}

export const drawingNode = (
  scene: DrawingScene,
  id: string
): DrawingNode | undefined => scene.nodes.find((node) => node.id === id)

export const portNode = (
  scene: DrawingScene,
  port: PortId
): DrawingNode | undefined =>
  scene.nodes.find((node) => node.kind === "boundary" && node.port === port)

export const trackEdges = (scene: DrawingScene): DrawingEdge[] =>
  scene.edges.filter((edge) => edge.kind === "track")

export const bondEdges = (scene: DrawingScene): DrawingEdge[] =>
  scene.edges.filter((edge) => edge.kind === "bond")
