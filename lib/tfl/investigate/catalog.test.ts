import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { catalogAllJunctions, groupCataloguedJunctions } from "./catalog.ts"

describe("junction catalogue", () => {
  it("groups by degree then type, starting at dual terminus", () => {
    const groups = groupCataloguedJunctions(catalogAllJunctions())
    assert.ok(groups.length >= 2)
    assert.equal(groups[0]!.degree, 2)
    assert.equal(groups[0]!.archetype, "non-through-degree-2")
    assert.match(groups[0]!.title, /Dual terminus/)
    assert.ok(groups[0]!.items.some((item) => item.junction.station.id === "940GZZLUHLT"))

    const throughY = groups.find((group) => group.degree === 3 && group.archetype === "through-y")
    assert.ok(throughY)
    assert.ok(throughY.items.some((item) => item.junction.station.name.includes("Leytonstone")))
    assert.ok(throughY.items.some((item) => item.junction.station.name.includes("Acton Main Line")))

    for (let index = 1; index < groups.length; index++) {
      const prev = groups[index - 1]!
      const next = groups[index]!
      assert.ok(prev.degree <= next.degree)
    }
  })
})
