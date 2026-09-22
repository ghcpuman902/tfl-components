import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  diagramAtomMetrics,
  envelopesIntersect,
  grownSegmentLength,
  laneEdgeGap,
  minimumBranchGap,
  shapeEnvelope,
  uBendPitch,
  type Shape,
} from "../../diagram-atoms.ts"
import { approximateStationMeasure } from "../../station-typography.ts"
import { buildDrawingScene } from "./drawing-graph.ts"
import {
  DEFAULT_LAYOUT_POLICY,
  collapseDrawing,
  layoutDrawing,
  scorePlacement,
  trackPathBetween,
} from "./drawing-layout.ts"
import { drawingVariants } from "./pattern.ts"
import { PORT_DEMO_NAMES, STATION_GROUP_NAME } from "./types.ts"

const nameHalf = (name: string, font: number): number => {
  const token =
    name.split(/\s+/).reduce((best, part) =>
      part.length > best.length ? part : best
    ) || name
  const cap = Math.ceil(approximateStationMeasure("X".repeat(10), font) / 2)
  return Math.min(cap, Math.ceil(approximateStationMeasure(token, font) / 2))
}

const expectedBoundaryPitch = (port: keyof typeof PORT_DEMO_NAMES): number => {
  const metrics = diagramAtomMetrics()
  return Math.max(
    72,
    Math.ceil(
      grownSegmentLength(
        nameHalf(STATION_GROUP_NAME, metrics.nameSize),
        nameHalf(PORT_DEMO_NAMES[port], metrics.nameSize),
        metrics
      )
    )
  )
}

const at = (
  placement: Map<string, { pos: number; lane: number }>,
  id: string
) => {
  const point = placement.get(id)
  assert.ok(point, `missing ${id}`)
  return point
}

describe("drawing graph", () => {
  it("splits S after the station on a stem Y, and before the stations on a split Y", () => {
    const stem = buildDrawingScene("y", "stem")!
    assert.equal(
      stem.nodes.filter((node) => node.kind === "fork").length,
      1
    )
    assert.equal(stem.nodes.filter((node) => node.kind === "station").length, 1)
    assert.ok(stem.edges.some((edge) => edge.a === "S" && edge.b === "Y"))

    const split = buildDrawingScene("y", "split")!
    assert.equal(
      split.nodes.filter((node) => node.kind === "fork").length,
      1
    )
    assert.equal(
      split.nodes.filter((node) => node.kind === "station").length,
      2
    )
    assert.ok(split.edges.some((edge) => edge.kind === "bond"))
    assert.ok(split.edges.some((edge) => edge.a === "Y" && edge.b === "S1"))
  })

  it("builds every supported building block", () => {
    for (const kind of [
      "through",
      "dual-terminus",
      "y",
      "through-terminus",
      "triangle",
      "three-termini",
      "independent-corridors",
    ] as const) {
      for (const variant of drawingVariants(kind)) {
        assert.ok(buildDrawingScene(kind, variant.id), `${kind} ${variant.id}`)
      }
    }
    assert.equal(buildDrawingScene("other", "default"), null)
  })
})

describe("drawing layout", () => {
  it("sits bonded stations at the gapped interchange pitch", () => {
    const pitch = diagramAtomMetrics().gappedBond
    const laid = layoutDrawing(buildDrawingScene("dual-terminus", "opposite")!)
    const s1 = laid.nodes.find((node) => node.id === "S1")!
    const s2 = laid.nodes.find((node) => node.id === "S2")!
    assert.equal(Math.abs(s1.y - s2.y), pitch)
    const split = layoutDrawing(buildDrawingScene("y", "split")!)
    const a = split.nodes.find((node) => node.id === "S1")!
    const b = split.nodes.find((node) => node.id === "S2")!
    assert.equal(Math.abs(a.y - b.y), pitch)
    assert.ok(pitch > 2 * diagramAtomMetrics().ringRadius)
  })

  it("widens a pinched bonded lane's own pitch when it carries its own boundary arm", () => {
    const metrics = diagramAtomMetrics()
    const bondPitch = metrics.gappedBond
    // "Three termini": S1↔S2↔S3, S2 bonded on both sides *and* running its
    // own track to a boundary (B) — the exact shape whose own name box
    // reaches toward a neighbour lane, unlike a bare two-ring interchange.
    const laid = layoutDrawing(buildDrawingScene("three-termini", "same-side")!)
    const s1 = laid.nodes.find((node) => node.id === "S1")!
    const s2 = laid.nodes.find((node) => node.id === "S2")!
    const s3 = laid.nodes.find((node) => node.id === "S3")!
    const gapA = Math.abs(s1.y - s2.y)
    const gapB = Math.abs(s2.y - s3.y)
    assert.equal(gapA, gapB, "both sides of the pinched lane grow the same")
    assert.ok(
      gapA > bondPitch,
      `pinched, labelled bond pitch ${gapA} should exceed the bare ${bondPitch}`
    )
  })

  it("keeps a bare two-ring interchange at the tight gappedBond pitch (no competing label)", () => {
    const pitch = diagramAtomMetrics().gappedBond
    const laid = layoutDrawing(buildDrawingScene("dual-terminus", "opposite")!)
    const s1 = laid.nodes.find((node) => node.id === "S1")!
    const s2 = laid.nodes.find((node) => node.id === "S2")!
    // Neither S1 nor S2 is "pinched" (bonded on only one side each) — the
    // ordinary bare-interchange pitch, not the labelled one.
    assert.equal(Math.abs(s1.y - s2.y), pitch)
  })

  it("extends a station–boundary run so the group name stays on the mark", () => {
    const expected = expectedBoundaryPitch("A")
    const laid = layoutDrawing(buildDrawingScene("independent-corridors", "default")!)
    const a = laid.nodes.find((node) => node.port === "A")!
    const s1 = laid.nodes.find((node) => node.id === "S1")!
    assert.equal(Math.abs(s1.x - a.x), expected)
    assert.ok(expected > 72)
    assert.ok(
      expected < 120,
      "Aldgate + Station must shrink past the old 10-character box"
    )
  })

  it("paints a widened station–boundary run's own reserved slack as excess, not one flat core chord", () => {
    const widened = expectedBoundaryPitch("A")
    const laid = layoutDrawing(buildDrawingScene("independent-corridors", "default")!)
    const edge = laid.tracks.find(
      (track) => track.a === "A" || track.b === "A"
    )!
    assert.equal(edge.segs.length, 2, JSON.stringify(edge.segs))
    const excess = edge.segs.find((seg) => seg.paint === "excess")!
    const core = edge.segs.find((seg) => seg.paint === "core")!
    assert.ok(excess, JSON.stringify(edge.segs))
    assert.doesNotMatch(excess.d, /[CA] /)
    assert.doesNotMatch(core.d, /[CA] /)
    const length = (d: string) => {
      const nums = d.match(/-?[\d.]+/g)!.map(Number)
      return Math.hypot(nums[2]! - nums[0]!, nums[3]! - nums[1]!)
    }
    assert.ok(
      Math.abs(length(excess.d) - (widened - 72)) < 1,
      `excess run length: got ${length(excess.d)}, wanted ${widened - 72}`
    )
  })

  it("keeps an un-widened plain track a single core seg, no phantom excess", () => {
    const laid = layoutDrawing(buildDrawingScene("y", "stem")!)
    const stationOnly = laid.tracks.find((track) => {
      const kindOf = (id: string) =>
        laid.nodes.find((node) => node.id === id)!.kind
      return kindOf(track.a) === "station" && kindOf(track.b) === "station"
    })
    if (stationOnly) {
      assert.equal(stationOnly.segs.length, 1)
      assert.equal(stationOnly.segs[0]!.paint, "core")
    }
  })

  it("keeps a dual-terminus interchange perpendicular to the tracks", () => {
    const scene = buildDrawingScene("dual-terminus", "opposite")!
    const placement = collapseDrawing(scene)
    const a = at(placement, "A")
    const b = at(placement, "B")
    const s1 = at(placement, "S1")
    const s2 = at(placement, "S2")
    assert.equal(s1.pos, s2.pos)
    assert.notEqual(s1.lane, s2.lane)
    assert.equal(a.lane, s1.lane)
    assert.equal(b.lane, s2.lane)
    assert.ok(a.pos < s1.pos)
    assert.ok(b.pos > s2.pos)
    assert.notEqual(a.lane, b.lane)
    assert.equal(scorePlacement(scene, placement), 0)
    assert.equal(layoutDrawing(scene).energy, 0)
  })

  it("rejects an interchange that continues the line of travel", () => {
    const scene = buildDrawingScene("dual-terminus", "opposite")!
    const collinear = new Map([
      ["A", { pos: 0, lane: 0 }],
      ["S1", { pos: 1, lane: 0 }],
      ["S2", { pos: 2, lane: 0 }],
      ["B", { pos: 3, lane: 0 }],
    ])
    assert.equal(
      scorePlacement(scene, collinear, DEFAULT_LAYOUT_POLICY),
      Number.POSITIVE_INFINITY
    )
  })

  it("keeps same-side termini on the start side of a vertical interchange", () => {
    const scene = buildDrawingScene("dual-terminus", "same-side")!
    const placement = collapseDrawing(scene)
    const a = at(placement, "A")
    const b = at(placement, "B")
    const s1 = at(placement, "S1")
    const s2 = at(placement, "S2")
    assert.equal(s1.pos, s2.pos)
    assert.ok(a.pos < s1.pos)
    assert.ok(b.pos < s2.pos)
    assert.notEqual(s1.lane, s2.lane)
    assert.equal(scorePlacement(scene, placement), 0)
  })

  it("fans a stem Y after an unlabelled split, keeping S on the trunk", () => {
    const scene = buildDrawingScene("y", "stem")!
    const placement = collapseDrawing(scene)
    const s = at(placement, "S")
    const y = at(placement, "Y")
    const a = at(placement, "A")
    const b = at(placement, "B")
    const c = at(placement, "C")
    assert.equal(s.pos - a.pos, 1)
    assert.equal(y.pos - s.pos, 1, "the trunk into a fork is one step, not an arm")
    assert.ok(a.pos < s.pos)
    assert.ok(s.pos < y.pos)
    assert.equal(s.lane, y.lane)
    assert.equal(a.lane, s.lane)
    assert.ok(y.pos < b.pos)
    assert.ok(y.pos < c.pos)
    assert.notEqual(b.lane, c.lane)
    assert.equal(b.pos, c.pos)
    assert.equal(b.pos - y.pos, 2)
    const laid = layoutDrawing(scene)
    for (const edge of laid.tracks.filter(
      (track) => track.a === "Y" || track.b === "Y"
    )) {
      if (edge.a !== "Y" && edge.b !== "Y") continue
      if (edge.a !== "B" && edge.b !== "B" && edge.a !== "C" && edge.b !== "C") {
        continue
      }
      // A fork's own arm is diagram-atoms's cubic stem recipe, not an arc.
      assert.match(edge.d, /C [-.\d]+ [-.\d]+, [-.\d]+ [-.\d]+, [-.\d]+ [-.\d]+/)
      assert.doesNotMatch(edge.d, /A /)
    }
  })

  it("places split-S copies on the branches, bonded perpendicular to travel", () => {
    const scene = buildDrawingScene("y", "split")!
    const placement = collapseDrawing(scene)
    const a = at(placement, "A")
    const y = at(placement, "Y")
    const s1 = at(placement, "S1")
    const s2 = at(placement, "S2")
    const b = at(placement, "B")
    assert.ok(a.pos < y.pos)
    assert.ok(y.pos < s1.pos)
    assert.equal(s1.pos, s2.pos)
    assert.notEqual(s1.lane, s2.lane)
    assert.ok(b.pos > s1.pos)
    assert.equal(
      scorePlacement(scene, placement) < Number.POSITIVE_INFINITY,
      true
    )
  })

  it("extends termini past the tick when ends are through", () => {
    const scene = buildDrawingScene("through", "default")!
    const stop = layoutDrawing(scene, {
      ...DEFAULT_LAYOUT_POLICY,
      end: "terminus",
    })
    const run = layoutDrawing(scene, {
      ...DEFAULT_LAYOUT_POLICY,
      end: "through",
    })
    assert.ok(run.width > stop.width)
    assert.equal(
      stop.nodes.filter((node) => node.stub).length,
      0
    )
    assert.equal(
      run.nodes.filter((node) => node.kind === "boundary" && node.stub).length,
      2
    )
  })

  it("applies the shared end policy to the every-pair cycle", () => {
    const scene = buildDrawingScene("triangle", "default")!
    const betweenBranches = trackPathBetween(scene, "B", "C")
    assert.ok(betweenBranches.has("track:S3-B"))
    assert.ok(betweenBranches.has("track:S3-C"))
    assert.equal(betweenBranches.has("track:Y-S1"), false)
    assert.equal(betweenBranches.has("track:Y-S2"), false)

    const stop = layoutDrawing(scene, {
      ...DEFAULT_LAYOUT_POLICY,
      end: "terminus",
    })
    const run = layoutDrawing(scene, {
      ...DEFAULT_LAYOUT_POLICY,
      end: "through",
    })
    assert.equal(stop.nodes.filter((node) => node.stub).length, 0)
    assert.equal(
      run.nodes.filter((node) => node.kind === "boundary" && node.stub).length,
      3
    )
    assert.ok(run.width > stop.width)
  })

  it("does not treat a walking bond as a through-path", () => {
    const scene = buildDrawingScene("dual-terminus", "opposite")!
    assert.equal(trackPathBetween(scene, "A", "B").size, 0)
    const y = buildDrawingScene("y", "stem")!
    assert.ok(trackPathBetween(y, "A", "B").size > 0)
    assert.equal(trackPathBetween(y, "B", "C").size, 0)
  })

  it("gives every supported block a finite energy", () => {
    for (const kind of [
      "through",
      "dual-terminus",
      "y",
      "through-terminus",
      "triangle",
      "three-termini",
      "independent-corridors",
    ] as const) {
      for (const variant of drawingVariants(kind)) {
        const scene = buildDrawingScene(kind, variant.id)!
        const energy = layoutDrawing(scene).energy
        assert.ok(
          Number.isFinite(energy),
          `${kind} ${variant.id} energy ${energy}`
        )
      }
    }
  })

  it("gives a fork's own bend diagram-atoms's cubic stem-arm recipe, not the cosmetic jog geometry", () => {
    const scene = buildDrawingScene("y", "stem")!
    const laid = layoutDrawing(scene)
    const forkEdge = laid.tracks.find(
      (track) => track.a === "B" || track.b === "B"
    )!
    // Two cubic bends (leave, return-to-travel) either side of a 45°
    // diagonal run — `buildStemArmPath`'s recipe, never an arc `A` command
    // (the cosmetic `CORNER`/old fork-radius jog this used to draw).
    const cubics = [
      ...forkEdge.d.matchAll(/C [-.\d]+ [-.\d]+, [-.\d]+ [-.\d]+, [-.\d]+ [-.\d]+/g),
    ]
    assert.equal(cubics.length, 2, forkEdge.d)
    assert.doesNotMatch(forkEdge.d, /A /)
  })

  it("never paints a fork arm's own bend as excess — only its straight runs flex", () => {
    const scene = buildDrawingScene("y", "stem")!
    const laid = layoutDrawing(scene)
    const forkEdge = laid.tracks.find(
      (track) => track.a === "B" || track.b === "B"
    )!
    const excess = forkEdge.segs.filter((seg) => seg.paint === "excess")
    assert.ok(excess.length > 0, JSON.stringify(forkEdge.segs))
    for (const seg of excess) assert.doesNotMatch(seg.d, /C /, seg.d)
    const core = forkEdge.segs.filter((seg) => seg.paint === "core")
    assert.ok(core.some((seg) => /C /.test(seg.d)), JSON.stringify(forkEdge.segs))
  })

  /** Every cubic bend's `Shape`, `p0` = the SVG's own point before the `C`, in path order. */
  const cubicBends = (d: string, halfWidth: number): Shape[] => {
    const tokens = d.match(/[MLC][^MLC]*/g) ?? []
    let cur = { x: 0, y: 0 }
    const shapes: Shape[] = []
    for (const token of tokens) {
      const nums = token.slice(1).trim().split(/[\s,]+/).map(Number)
      if (token[0] === "C") {
        const [p1x, p1y, p2x, p2y, p3x, p3y] = nums as [
          number, number, number, number, number, number,
        ]
        const p0 = cur
        const p3 = { x: p3x, y: p3y }
        shapes.push({
          kind: "cubic",
          p0,
          p1: { x: p1x, y: p1y },
          p2: { x: p2x, y: p2y },
          p3,
          halfWidth,
        })
        cur = p3
      } else {
        cur = { x: nums[0]!, y: nums[1]! }
      }
    }
    return shapes
  }

  it("keeps a fork's own bend clear of the mark its branch leads to", () => {
    const metrics = diagramAtomMetrics()
    for (const [kind, variantId] of [
      ["y", "stem"],
      ["y", "split"],
      ["triangle", "default"],
      ["through-terminus", "default"],
    ] as const) {
      const scene = buildDrawingScene(kind, variantId)!
      const laid = layoutDrawing(scene)
      const byId = new Map(laid.nodes.map((node) => [node.id, node]))
      const forks = laid.nodes.filter((node) => node.kind === "fork")
      for (const fork of forks) {
        for (const edge of laid.tracks) {
          if (edge.a !== fork.id && edge.b !== fork.id) continue
          const farId = edge.a === fork.id ? edge.b : edge.a
          const far = byId.get(farId)!
          if (far.kind === "fork") continue
          const bends = cubicBends(edge.d, metrics.x / 2)
          if (bends.length === 0) continue // straight run, no bend to check
          const lastBend = bends[bends.length - 1]!
          const clears = !envelopesIntersect(
            shapeEnvelope(lastBend),
            shapeEnvelope({
              kind: "circle",
              cx: far.x,
              cy: far.y,
              r: metrics.ringRadius,
            })
          )
          assert.ok(
            clears,
            `${kind}/${variantId}: ${farId} sits on ${fork.id}'s own bend`
          )
        }
      }
    }
  })

  it("sits the every-pair apex along travel, with a U-bend to B and C", () => {
    const metrics = diagramAtomMetrics()
    const laid = layoutDrawing(buildDrawingScene("triangle", "default")!)
    const s1 = laid.nodes.find((node) => node.id === "S1")!
    const s2 = laid.nodes.find((node) => node.id === "S2")!
    const s3 = laid.nodes.find((node) => node.id === "S3")!
    assert.equal(s1.x, s2.x)
    assert.ok(s3.x > s1.x, "apex sits past the base pair")
    const pitch = uBendPitch(metrics)
    assert.ok(
      Math.abs(Math.abs(s2.y - s1.y) - pitch) < 1,
      `base pitch ${Math.abs(s2.y - s1.y)} vs uBendPitch ${pitch}`
    )
    assert.ok(pitch > metrics.gappedBond, "U-hosting triangle grows past a tight bond")
    const dist = (p: { x: number; y: number }, q: { x: number; y: number }) =>
      Math.hypot(q.x - p.x, q.y - p.y)
    for (const [p, q] of [
      [s1, s2],
      [s1, s3],
      [s2, s3],
    ] as const) {
      assert.ok(
        Math.abs(dist(p, q) - pitch) < 1.5,
        `triangle side ${dist(p, q)} vs ${pitch}`
      )
    }
    const aldgate = laid.nodes.find((node) => node.id === "A")!
    const fork = laid.nodes.find((node) => node.id === "Y")!
    assert.ok(
      Math.abs(fork.x - aldgate.x) < Math.abs(s1.x - fork.x),
      "the incoming trunk is shorter than a fork arm"
    )
    const uArm = laid.tracks.find(
      (track) =>
        (track.a === "S3" || track.b === "S3") &&
        (track.a === "B" || track.b === "B" || track.a === "C" || track.b === "C") &&
        track.d.length > 0
    )!
    assert.match(uArm.d, /A /)
    assert.doesNotMatch(uArm.d, /C /)
    assert.equal((uArm.d.match(/A /g) ?? []).length, 1)
  })

  it("fans a fork's branches wide enough to clear minimumBranchGap edge-to-edge", () => {
    const metrics = diagramAtomMetrics()
    const scene = buildDrawingScene("y", "stem")!
    const laid = layoutDrawing(scene)
    const b = laid.nodes.find((node) => node.id === "B")!
    const c = laid.nodes.find((node) => node.id === "C")!
    assert.equal(b.pos, c.pos)
    const crossDistance = Math.hypot(b.x - c.x, b.y - c.y)
    assert.ok(
      laneEdgeGap(crossDistance, metrics) >= minimumBranchGap(metrics),
      `branch lanes ${crossDistance}px apart clear only ${laneEdgeGap(crossDistance, metrics)}px, need ${minimumBranchGap(metrics)}px`
    )
  })
})
