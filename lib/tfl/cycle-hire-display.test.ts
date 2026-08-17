import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  buildCycleHireDisplayPages,
  cycleHireDisplayPageId,
  normalizeCycleHireDisplayTiles,
  refreshCycleHireDisplayPage,
} from "./cycle-hire-display"

const items = [1, 2, 3, 4, 5].map((value) => ({
  id: String(value),
  value,
}))

describe("cycle hire display pages", () => {
  it("defaults to two tiles and normalises invalid values", () => {
    assert.equal(normalizeCycleHireDisplayTiles(), 2)
    assert.equal(normalizeCycleHireDisplayTiles(0), 1)
    assert.equal(normalizeCycleHireDisplayTiles(2.9), 2)
    assert.equal(normalizeCycleHireDisplayTiles(Number.NaN), 2)
  })

  it("keeps pages sequential and leaves a short final page short", () => {
    const pages = buildCycleHireDisplayPages(items, 3)
    assert.deepEqual(
      pages.map((page) => page.map((item) => item.value)),
      [
        [1, 2, 3],
        [4, 5],
      ]
    )
  })

  it("does not overlap pages that already fit exactly", () => {
    const pages = buildCycleHireDisplayPages(items.slice(0, 4), 2)
    assert.deepEqual(
      pages.map((page) => page.map((item) => item.value)),
      [
        [1, 2],
        [3, 4],
      ]
    )
  })

  it("returns one empty page for an empty or header-only display", () => {
    assert.deepEqual(buildCycleHireDisplayPages([], 3), [[]])
    assert.deepEqual(buildCycleHireDisplayPages(items, 0), [[]])
  })

  it("builds a stable page id and refreshes values without changing members", () => {
    const page = items.slice(0, 2)
    const refreshed = refreshCycleHireDisplayPage(page, [
      { id: "2", value: 20 },
      { id: "3", value: 30 },
    ])

    assert.equal(cycleHireDisplayPageId(page), "1|2")
    assert.deepEqual(refreshed, [items[0], { id: "2", value: 20 }])
  })
})
