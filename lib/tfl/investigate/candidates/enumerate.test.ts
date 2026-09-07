import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { analyzeLine } from "../analyze-line.ts"
import { buildPassengerGraph } from "../passenger-graph.ts"
import { buildCandidatesForJunction, buildExplorerModel } from "./enumerate.ts"

const junctionOn = (lineId: string, stationId: string) => {
  const analysis = analyzeLine(lineId)
  assert.ok(analysis)
  const junction = analysis.junctions.find((entry) => entry.station.id === stationId)
  assert.ok(junction)
  return junction
}

describe("candidate enumeration", () => {
  it("splits Circle Edgware Road into bonded through and terminus constituents", () => {
    const model = buildExplorerModel("circle", junctionOn("circle", "940GZZLUERC"))
    assert.ok(model)
    assert.equal(model.candidates.length, 1)
    assert.equal(model.candidates[0]!.id, "c1")
    const tree = model.candidates[0]!.tree
    const stations = tree.nodes.filter((node) => node.kind === "station")
    assert.equal(stations.length, 2)
    assert.equal(tree.nodes.filter((node) => node.kind === "anonymous").length, 0)
    assert.equal(tree.edges.filter((edge) => edge.kind === "bond").length, 1)
    const paddingtons = model.neighbours.filter((neighbour) => /paddington/i.test(neighbour.name))
    assert.equal(paddingtons.length, 2)
    assert.notEqual(paddingtons[0]!.id, paddingtons[1]!.id)
    assert.equal(model.candidates[0]!.comparison.exact, true)
    assert.match(model.candidates[0]!.coupledLayoutNote ?? "", /Paddington/)
  })

  it("splits Northern Euston into two bonded through-corridors", () => {
    const model = buildExplorerModel("northern", junctionOn("northern", "940GZZLUEUS"))
    assert.ok(model)
    assert.equal(model.candidates.length, 1)
    const tree = model.candidates[0]!.tree
    assert.equal(tree.nodes.filter((node) => node.kind === "station").length, 2)
    assert.equal(tree.edges.filter((edge) => edge.kind === "bond").length, 1)
    assert.equal(model.candidates[0]!.comparison.exact, true)
    assert.equal(model.candidates[0]!.comparison.missing, 0)
    assert.equal(model.candidates[0]!.comparison.extra, 0)
  })

  it("enumerates Camden Town two-Y trees with a deterministic order", () => {
    const junction = junctionOn("northern", "940GZZLUCTN")
    const graph = buildPassengerGraph("northern")
    assert.ok(graph)
    const first = buildCandidatesForJunction(graph, junction)
    const second = buildCandidatesForJunction(graph, junction)
    assert.deepEqual(
      first.map((candidate) => candidate.id),
      second.map((candidate) => candidate.id)
    )
    assert.deepEqual(
      first.map((candidate) => candidate.canonicalKey),
      second.map((candidate) => candidate.canonicalKey)
    )
    assert.equal(first.length, 2)
    assert.ok(first.every((candidate) => candidate.comparison.exact))
    const keys = new Set(first.map((candidate) => candidate.canonicalKey))
    assert.equal(keys.size, first.length)
    assert.ok(first.every((candidate) => candidate.tree.nodes.some((node) => node.kind === "anonymous") || candidate.tree.nodes.filter((node) => node.kind === "station").length >= 1))
  })

  it("keeps genuinely different station placements as different candidates when they stay minimal", () => {
    const candidates = buildExplorerModel("northern", junctionOn("northern", "940GZZLUCTN"))?.candidates ?? []
    const placements = new Set(
      candidates.map((candidate) =>
        candidate.tree.nodes
          .filter((node) => node.kind === "station")
          .map((node) => node.id)
          .sort()
          .join(",")
      )
    )
    if (candidates.length > 1) assert.ok(placements.size > 1)
  })

  it("finds at least one exact Finchley Central through-Y", () => {
    const model = buildExplorerModel("northern", junctionOn("northern", "940GZZLUFYC"))
    assert.ok(model)
    assert.equal(model.candidates.length, 1)
    assert.equal(model.candidates[0]!.comparison.exact, true)
    assert.equal(model.candidates[0]!.tree.nodes.filter((node) => node.kind === "anonymous").length, 0)
  })

  it("enumerates Earl's Court degree-5 trees and reports match quality", () => {
    const model = buildExplorerModel("district", junctionOn("district", "940GZZLUECT"))
    assert.ok(model)
    assert.ok(model.candidates.length >= 1)
    assert.equal(model.candidates[0]!.id, "c1")
    const ids = model.candidates.map((candidate) => candidate.id)
    assert.deepEqual(ids, ids.slice().sort((left, right) => left.localeCompare(right, undefined, { numeric: true })))
    const keys = new Set(model.candidates.map((candidate) => candidate.canonicalKey))
    assert.equal(keys.size, model.candidates.length)
    assert.ok(model.candidates[0]!.stats.maxDegree <= 3)
  })
})
