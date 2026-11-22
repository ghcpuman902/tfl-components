import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { freshArrivalsUrl } from "@/lib/tfl/fresh-arrivals"

describe("freshArrivalsUrl", () => {
  it("is unique per call, so TfL's edge cache cannot answer it", () => {
    const a = freshArrivalsUrl("/StopPoint/490000129E/Arrivals", "k", 1_000)
    const b = freshArrivalsUrl("/StopPoint/490000129E/Arrivals", "k", 2_000)
    assert.notEqual(a.toString(), b.toString())
    assert.equal(a.pathname, "/StopPoint/490000129E/Arrivals")
    assert.equal(a.searchParams.get("_"), "1000")
  })
})
