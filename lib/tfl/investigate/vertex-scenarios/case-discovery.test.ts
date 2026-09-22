import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  caseSignature,
  discoverWorkbenchCases,
} from "./case-discovery"
import { composeYs } from "./compose"
import { isDirectional } from "./directed-matrix"
import { classifyPattern } from "./pattern"
import { PORT_LABELS } from "./types"
import { WORKBENCH_PRESETS } from "./workbench-presets"

describe("workbench case discovery", () => {
  it("drops the unrenderable directed one-way and complete-six presets", () => {
    assert.equal(
      WORKBENCH_PRESETS.some((preset) => preset.id === "directed"),
      false
    )
    assert.equal(
      WORKBENCH_PRESETS.some((preset) => preset.id === "six"),
      false
    )
  })

  it("keeps pedagogical presets that already draw and never lists Earl's Court", () => {
    const cases = discoverWorkbenchCases()
    const ids = cases.map((preset) => preset.id)
    assert.ok(ids.includes("shared-five"))
    assert.ok(ids.includes("missing-one"))
    assert.ok(ids.includes("triangle"))
    assert.equal(
      cases.some((preset) => preset.id === "earls-court"),
      false
    )
    assert.equal(
      cases.some((preset) => /earl|kensington|olympia/i.test(preset.title)),
      false
    )
    assert.equal(
      cases.some((preset) => preset.armNames != null),
      false
    )
  })

  it("never includes a directional matrix or a complete six-arm graph", () => {
    const cases = discoverWorkbenchCases()
    for (const preset of cases) {
      assert.equal(isDirectional(preset.matrix), false, preset.id)
      const completeSix =
        preset.matrix.ports.length === 6 &&
        preset.matrix.moves.length === 6 * 5
      assert.equal(completeSix, false, preset.id)
    }
  })

  it("only lists a matrix that a known-block drawer or composeYs can draw", () => {
    const cases = discoverWorkbenchCases()
    assert.ok(cases.length >= WORKBENCH_PRESETS.length)
    for (const preset of cases) {
      const kind = classifyPattern(preset.matrix)
      if (kind === "other") {
        assert.ok(composeYs(preset.matrix).length > 0, preset.id)
      }
    }
  })

  it("dedupes isomorphic shapes so pedagogical titles win", () => {
    const cases = discoverWorkbenchCases()
    const sigs = cases.map((preset) => caseSignature(preset.matrix))
    assert.equal(new Set(sigs).size, sigs.length)
    const shared = cases.find((preset) => preset.id === "shared-five")
    assert.ok(shared)
    assert.match(shared!.title, /Two groups share a segment/)
  })

  it("does not treat a complete six-arm matrix as a case even if asked", () => {
    const six = {
      ports: [...PORT_LABELS],
      moves: PORT_LABELS.flatMap((from) =>
        PORT_LABELS.filter((to) => to !== from).map((to) => ({ from, to }))
      ),
    }
    const extra = discoverWorkbenchCases([
      ...WORKBENCH_PRESETS,
      { id: "six", title: "6 arms · Every pair", note: "", matrix: six },
    ])
    assert.equal(
      extra.some((preset) => preset.id === "six"),
      false
    )
    assert.deepEqual(composeYs(six), [])
  })
})
