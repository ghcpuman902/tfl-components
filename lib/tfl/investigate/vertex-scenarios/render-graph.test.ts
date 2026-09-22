import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { composeYs } from "./compose"
import { trackEdges } from "./drawing-graph"
import {
  DEFAULT_LAYOUT_POLICY,
  collapseDrawing,
  layoutDrawing,
} from "./drawing-layout"
import { composedTreeToScene } from "./render-graph"
import { WORKBENCH_PRESETS } from "./workbench-presets"

const presetMatrix = (id: string) =>
  WORKBENCH_PRESETS.find((preset) => preset.id === id)!.matrix

describe("composed tree -> drawing scene", () => {
  it("keeps every leaf's port label", () => {
    const matrix = presetMatrix("missing-one")
    const [composition] = composeYs(matrix)
    assert.ok(composition)
    const scene = composedTreeToScene(composition!, "A", 0)
    const ports = scene.nodes
      .filter((node) => node.kind === "boundary")
      .map((node) => node.port)
      .sort()
    assert.deepEqual(ports, [...matrix.ports].sort())
  })

  it("splits a marked edge into a station and bonds sibling markers at the same fork", () => {
    const matrix = presetMatrix("missing-one")
    const [composition] = composeYs(matrix)
    assert.ok(composition)
    const scene = composedTreeToScene(composition!, "A", 0)
    const stations = scene.nodes.filter((node) => node.kind === "station")
    assert.equal(stations.length, composition!.markerVariants[0]!.length)
    // Every marked edge becomes exactly two track edges meeting at its station.
    for (const station of stations) {
      const incident = trackEdges(scene).filter(
        (edge) => edge.a === station.id || edge.b === station.id
      )
      assert.equal(incident.length, 2)
    }
  })

  it("gives every composed candidate, marker variant, and root a finite layout energy", () => {
    for (const presetId of ["missing-one", "shared-five"]) {
      const matrix = presetMatrix(presetId)
      for (const composition of composeYs(matrix)) {
        for (
          let markerIndex = 0;
          markerIndex < composition.markerVariants.length;
          markerIndex++
        ) {
          for (const root of matrix.ports) {
            const scene = composedTreeToScene(composition, root, markerIndex)
            const laid = layoutDrawing(scene)
            assert.ok(
              Number.isFinite(laid.energy),
              `${presetId} from ${root}: energy is not finite`
            )
          }
        }
      }
    }
  })

  it("never lets a track edge span more than one fork's worth of generation — the regression for the long empty diagonal", () => {
    for (const presetId of ["missing-one", "shared-five"]) {
      const matrix = presetMatrix(presetId)
      for (const composition of composeYs(matrix)) {
        for (const root of matrix.ports) {
          const scene = composedTreeToScene(composition, root, 0)
          const placement = collapseDrawing(scene)
          for (const edge of trackEdges(scene)) {
            const a = placement.get(edge.a)
            const b = placement.get(edge.b)
            assert.ok(a && b, `${edge.id} missing a placed endpoint`)
            const delta = Math.abs(a!.pos - b!.pos)
            assert.ok(
              delta <= 2,
              `${presetId} from ${root}: edge ${edge.id} spans ${delta} generations`
            )
          }
        }
      }
    }
  })

  it("gives a fork-to-fork join the two-step arm and the Y/peel recipe, not a raw slash", () => {
    const matrix = presetMatrix("shared-five")
    const [composition] = composeYs(matrix)
    assert.ok(composition)
    const scene = composedTreeToScene(composition, "A", 0)
    const kindOf = (id: string) =>
      scene.nodes.find((node) => node.id === id)!.kind
    const placement = collapseDrawing(scene)
    const laid = layoutDrawing(scene, {
      ...DEFAULT_LAYOUT_POLICY,
      primary: "left",
    })
    const joins = laid.tracks.filter(
      (track) => kindOf(track.a) === "fork" && kindOf(track.b) === "fork"
    )
    assert.ok(joins.length > 0, "shared-five from A has a fork-to-fork join")
    let peeled = 0
    for (const edge of joins) {
      const a = placement.get(edge.a)!
      const b = placement.get(edge.b)!
      if (a.lane === b.lane || a.pos === b.pos) continue
      peeled += 1
      assert.equal(
        Math.abs(a.pos - b.pos),
        2,
        `${edge.a}-${edge.b} should be an arm hop, not a one-step stem`
      )
      const cubics = [
        ...edge.d.matchAll(
          /C [-.\d]+ [-.\d]+, [-.\d]+ [-.\d]+, [-.\d]+ [-.\d]+/g
        ),
      ]
      assert.equal(cubics.length, 2, edge.d)
      assert.doesNotMatch(edge.d, /A /)
    }
    assert.ok(peeled > 0, "at least one fork-to-fork join changes lane")
  })
})
