import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { canonicalSkeletonKey, enumerateBinarySkeletons } from "./trees.ts"

describe("binary skeletons", () => {
  it("has one Y on three labelled leaves", () => {
    const trees = enumerateBinarySkeletons(["a", "b", "c"])
    assert.equal(trees.length, 1)
    assert.equal(trees[0]!.nodes.filter((node) => node.kind === "internal").length, 1)
  })

  it("has three distinct pairings on four labelled leaves", () => {
    const trees = enumerateBinarySkeletons(["a", "b", "c", "d"])
    assert.equal(trees.length, 3)
    const keys = new Set(trees.map((tree) => canonicalSkeletonKey(tree)))
    assert.equal(keys.size, 3)
  })

  it("has fifteen distinct trees on five labelled leaves", () => {
    assert.equal(enumerateBinarySkeletons(["a", "b", "c", "d", "e"]).length, 15)
  })

  it("collapses construction order and drawing flips to one key", () => {
    const forward = enumerateBinarySkeletons(["a", "b", "c", "d"])
    const reverse = enumerateBinarySkeletons(["d", "c", "b", "a"])
    const rotated = enumerateBinarySkeletons(["b", "c", "d", "a"])
    const forwardKeys = [...new Set(forward.map((tree) => canonicalSkeletonKey(tree)))].sort()
    assert.deepEqual(forwardKeys, [...new Set(reverse.map((tree) => canonicalSkeletonKey(tree)))].sort())
    assert.deepEqual(forwardKeys, [...new Set(rotated.map((tree) => canonicalSkeletonKey(tree)))].sort())
  })
})
