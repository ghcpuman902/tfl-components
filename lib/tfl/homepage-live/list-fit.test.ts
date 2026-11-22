import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { listHeightToScreenBottom, MIN_LIST_HEIGHT_PX } from "@/lib/tfl/homepage-live/list-fit"

describe("listHeightToScreenBottom", () => {
  it("reaches the bottom of the screen from the list's top", () => {
    assert.equal(listHeightToScreenBottom(844, 147), 697)
  })

  it("grows when the page is scrolled and the list's top moves up", () => {
    assert.equal(listHeightToScreenBottom(844, -24), 868)
  })

  it("keeps a minimum height when the field sits low on the screen", () => {
    assert.equal(listHeightToScreenBottom(844, 800), MIN_LIST_HEIGHT_PX)
  })
})
