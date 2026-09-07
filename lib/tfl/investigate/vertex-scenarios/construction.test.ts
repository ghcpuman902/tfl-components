import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  checkConstruction,
  constructPassages,
  togglePermission,
  type ConstructionMethod,
} from "./construction"
import { WORKBENCH_PRESETS, presetFromJunction } from "./workbench-presets"
import { PORT_LABELS, type DirectedMatrix, type DirectedMove } from "./types"
import { catalogAllJunctions } from "../catalog"

const methods: ConstructionMethod[] = ["pairs", "components", "share"]

function assertExact(matrix: DirectedMatrix) {
  for (const method of methods) {
    const construction = constructPassages(matrix, method)
    const check = checkConstruction(matrix, construction)
    assert.equal(check.exact, true, JSON.stringify({ matrix, method, check }))
    for (const block of construction.blocks) {
      assert.ok(
        block.left.every((port) => !block.right.includes(port)),
        "a fork cannot contain the same arm on both sides"
      )
    }
  }
}

describe("local passage construction", () => {
  it("preserves every one of the 1,024 symmetric five-arm matrices, including isolated arms", () => {
    const ports = PORT_LABELS.slice(0, 5)
    const pairs = ports.flatMap((from, i) =>
      ports.slice(i + 1).map((to) => ({ from, to }))
    )
    for (let bits = 0; bits < 1 << pairs.length; bits++) {
      const moves = pairs.flatMap((move, i) =>
        bits & (1 << i) ? [move, { from: move.to, to: move.from }] : []
      )
      assertExact({ ports, moves })
    }
  })

  it("preserves all 4,096 directed four-arm matrices", () => {
    const ports = PORT_LABELS.slice(0, 4)
    const cells = ports.flatMap((from) =>
      ports.filter((to) => to !== from).map((to) => ({ from, to }))
    )
    for (let bits = 0; bits < 1 << cells.length; bits++) {
      assertExact({ ports, moves: cells.filter((_, i) => bits & (1 << i)) })
    }
  })

  it("preserves a deterministic sample of 128 directed six-arm matrices", () => {
    let seed = 42
    for (let sample = 0; sample < 128; sample++) {
      const moves: DirectedMove[] = []
      for (const from of PORT_LABELS)
        for (const to of PORT_LABELS) {
          seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
          if (from !== to && seed % 7 < 3) moves.push({ from, to })
        }
      assertExact({ ports: [...PORT_LABELS], moves })
    }
  })

  it("exposes the exact counterexample when one pair is removed from a shared segment", () => {
    const matrix = WORKBENCH_PRESETS.find((p) => p.id === "shared-five")!.matrix
    const held = constructPassages(matrix, "share")
    assert.equal(held.blocks.length, 1)
    const edited = togglePermission(matrix, "B", "E", true)
    const check = checkConstruction(edited, held)
    assert.deepEqual(check.extra.map((m) => `${m.from}>${m.to}`).sort(), [
      "B>E",
      "E>B",
    ])
    assert.equal(check.missing.length, 0)
    assert.equal(constructPassages(edited, "share").blocks.length, 2)
    assertExact(edited)
  })

  it("does not invent a reverse permission when the two directions differ", () => {
    const matrix = WORKBENCH_PRESETS.find((p) => p.id === "directed")!.matrix
    const drawing = constructPassages(matrix, "share")
    assert.ok(drawing.blocks.some((block) => block.direction === "forward"))
    assertExact(matrix)
  })

  it("checks arm preservation even when there are no movements", () => {
    const check = checkConstruction(
      { ports: ["A", "B"], moves: [] },
      { blocks: [], termini: ["A"] }
    )
    assert.equal(check.exact, false)
    assert.deepEqual(check.missingArms, ["B"])
  })

  it("retains the real Earl's Court arm identities and Olympia exception", () => {
    const junction = catalogAllJunctions().find(
      (item) =>
        item.lineId === "district" && item.junction.station.id === "940GZZLUECT"
    )!.junction
    const preset = presetFromJunction(junction)
    const port = (name: string) =>
      preset.matrix.ports.find((p) => preset.armNames?.[p] === name)!
    const hsk = port("High Street Kensington")
    const gloucester = port("Gloucester Road")
    const olympia = port("Kensington (Olympia)")
    assert.ok(
      preset.matrix.moves.some((m) => m.from === hsk && m.to === olympia)
    )
    assert.ok(
      !preset.matrix.moves.some(
        (m) => m.from === gloucester && m.to === olympia
      )
    )
    assertExact(preset.matrix)
  })
})
