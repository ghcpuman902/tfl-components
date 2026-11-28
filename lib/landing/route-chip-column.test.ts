import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { balancedPerRow } from "@/components/home/route-chip-column"

describe("route chip column balance", () => {
  it("fills rows evenly: 9 that fit 4 across go 3 + 3 + 3, never 4 + 4 + 1", () => {
    assert.equal(balancedPerRow(9, 4), 3)
    assert.equal(balancedPerRow(7, 4), 4)
    assert.equal(balancedPerRow(6, 4), 3)
  })

  it("leaves a column that already fits on one row alone", () => {
    assert.equal(balancedPerRow(3, 4), 3)
    assert.equal(balancedPerRow(1, 2), 1)
  })

  it("never leaves a lone chip on the last row when a wider column is allowed", () => {
    // 5 chips fitting 2 across would end 2 + 2 + 1: allow 3 across (3 + 2).
    assert.equal(balancedPerRow(5, 2, 3), 3)
    // 7 fitting 3 across would end 3 + 3 + 1: 4 across gives 4 + 3.
    assert.equal(balancedPerRow(7, 3, 4), 4)
  })

  it("keeps the even fill when no wider column is allowed", () => {
    assert.equal(balancedPerRow(5, 2), 2)
  })
})
