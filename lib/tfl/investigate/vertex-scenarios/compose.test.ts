import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { composeYs, checkComposed } from "./compose"
import { reconstructDirected } from "./reconstruct"
import { WORKBENCH_PRESETS } from "./workbench-presets"
import { PORT_LABELS } from "./types"

describe("composing local Ys", () => {
  it("joins the five-pair exception without repeating an arm", () => {
    const matrix = WORKBENCH_PRESETS.find((p) => p.id === "missing-one")!.matrix
    const candidates = composeYs(matrix)
    assert.ok(candidates.length)
    for (const candidate of candidates) {
      assert.deepEqual(
        candidate.tree.nodes.flatMap((n) => (n.port ? [n.port] : [])).sort(),
        matrix.ports
      )
      assert.equal(Object.keys(candidate.stems).length, 3)
      assert.equal(candidate.markerVariants[0]!.length, 2)
      assert.equal(checkComposed(matrix, candidate).extra.length, 0)
      assert.equal(checkComposed(matrix, candidate).missing.length, 0)
    }
  })

  it("distinguishes the photographed six-pair arrangement from the five-pair snapshot", () => {
    const full = WORKBENCH_PRESETS.find((p) => p.id === "shared-five")!.matrix
    const partial = WORKBENCH_PRESETS.find(
      (p) => p.id === "missing-one"
    )!.matrix
    const candidates = composeYs(full)
    assert.ok(candidates.length)
    for (const candidate of candidates) {
      assert.equal(candidate.markerVariants[0]!.length, 1)
      assert.deepEqual(
        checkComposed(partial, candidate)
          .extra.map((m) => `${m.from}>${m.to}`)
          .sort(),
        ["B>E", "E>B"]
      )
    }
  })

  it("checks every generated five-arm composition and every marker variant", () => {
    const ports = PORT_LABELS.slice(0, 5)
    const pairs = ports.flatMap((from, i) =>
      ports.slice(i + 1).map((to) => ({ from, to }))
    )
    let matched = 0
    for (let mask = 0; mask < 1024; mask++) {
      const matrix = {
        ports,
        moves: pairs.flatMap((m, i) =>
          mask & (1 << i) ? [m, { from: m.to, to: m.from }] : []
        ),
      }
      for (const candidate of composeYs(matrix)) {
        matched++
        const check = checkComposed(matrix, candidate)
        assert.equal(check.extra.length, 0)
        assert.equal(check.missing.length, 0)
        const paths = reconstructDirected(candidate.tree, ports).filter(
          (p) => p.permitted
        )
        for (const markers of candidate.markerVariants)
          assert.ok(
            paths.every((path) =>
              markers.some((edge) => path.edgeIds.includes(edge))
            ),
            "a train passage must encounter S"
          )
        for (const [node, stem] of Object.entries(candidate.stems)) {
          const turns = candidate.tree.forbiddenTurns.filter(
            (turn) => turn.at === node
          )
          assert.equal(
            turns.length,
            2,
            "only the two directed branch reversals are forbidden"
          )
          assert.ok(
            turns.every((turn) => turn.from !== stem && turn.to !== stem)
          )
        }
      }
    }
    assert.ok(matched > 0)
  })

  it("does not claim a pure Y tree for an all-pairs triangle or one-way case", () => {
    for (const id of ["triangle", "directed"])
      assert.deepEqual(
        composeYs(WORKBENCH_PRESETS.find((p) => p.id === id)!.matrix),
        []
      )
  })
})
