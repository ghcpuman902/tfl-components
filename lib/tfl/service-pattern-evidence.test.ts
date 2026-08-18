import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { servicePatternEvidenceForLine } from "./service-pattern-evidence"

const byName = (
  dataset: NonNullable<ReturnType<typeof servicePatternEvidenceForLine>>
) =>
  new Map(
    dataset.patterns.flatMap((pattern) =>
      pattern.stationIds.map(
        (stationId, index) => [pattern.stationNames[index]!, stationId] as const
      )
    )
  )

describe("servicePatternEvidenceForLine", () => {
  it("keeps each Elizabeth line ordered route as a complete pattern", () => {
    const dataset = servicePatternEvidenceForLine("elizabeth")
    assert.ok(dataset)
    assert.equal(dataset.patterns.length, 19)
    assert.equal(dataset.branchSegmentCount, 24)
    assert.equal(dataset.directionPairs.filter((pair) => pair.paired).length, 9)
    assert.equal(
      dataset.directionPairs.filter((pair) => !pair.paired).length,
      1
    )
  })

  it("does not invent a Stratford to Canary Wharf continuation at Whitechapel", () => {
    const dataset = servicePatternEvidenceForLine("elizabeth")
    assert.ok(dataset)
    const names = byName(dataset)
    const whitechapel = names.get("Whitechapel")
    const stratford = names.get("Stratford")
    const canaryWharf = names.get("Canary Wharf")
    assert.ok(whitechapel && stratford && canaryWharf)

    const forbidden = dataset.movements.some(
      (movement) =>
        movement.viaStationId === whitechapel &&
        ((movement.fromStationId === stratford &&
          movement.toStationId === canaryWharf) ||
          (movement.fromStationId === canaryWharf &&
            movement.toStationId === stratford))
    )
    assert.equal(forbidden, false)
  })
})
