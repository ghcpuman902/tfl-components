import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  buildStemArmPath,
  diagramAtomMetrics,
  envelopeOf,
  envelopesIntersect,
  connectingStrokeLength,
  diagramLabelBoxAlong,
  grownSegmentLength,
  labelWidthBesideNeighbor,
  headingBendCross,
  interchangeBondBox,
  interchangeLens,
  joinRingFromStem,
  layoutUBend,
  diagramLabelPad,
  labelAwayFromStroke,
  labelClearanceGap,
  labelClearanceLayout,
  labelShiftFromMark,
  laneClearanceRect,
  laneEdgeGap,
  layoutStem,
  markClearanceRect,
  octilinearBendClearsMark,
  octilinearBendEnvelope,
  markHalfForSide,
  markerAlongHalf,
  markerCrossHalf,
  markerLane,
  minimumBranchGap,
  nameCrossHalf,
  octilinearCubic,
  paintSegmentParts,
  parallelStemStagger,
  returnFlatRun,
  safeForkRadius,
  shapeEnvelope,
  stemExitGap,
  stemTipHeading,
  stemTipPlane,
  stationInwardAlong,
  stationSvgAlong,
  stemTipPlaneStep,
  STEM_RECIPES,
  STROKE_JOIN,
  stationAlongHalf,
  strokeClearanceBand,
  tflBendRadius,
  stemArmFromTo,
  throughJoinAlong,
  tickCrossHalves,
  travelLabelAnchor,
  triangleApexAlong,
  triangleApexFromBase,
  triangleInterchangeCentres,
  bondedGroupLabelAt,
  minimumUBendRadius,
  uBendBetween,
  uBendPitch,
  type Envelope,
  type Pt,
  type Shape,
} from "./diagram-atoms.ts"

describe("diagram atoms", () => {
  it("keeps official tick, ring, and dumbbell ratios", () => {
    const m = diagramAtomMetrics()
    assert.equal(m.x, 10)
    assert.equal(m.ringRadius, 15)
    assert.equal(m.tickAlong, 10 * 0.66)
    assert.equal(m.bondCentre, 25)
    assert.equal(m.gappedBond, 38)
    assert.ok(m.gappedBond > 2 * m.ringRadius)
    assert.equal(m.nameSize, 20)
    assert.equal(m.labelMaxWidth, 140)
  })

  it("shifts terminus labels onto the mark, not the SVG midpoint", () => {
    assert.equal(labelShiftFromMark(30, 60), 0)
    assert.equal(labelShiftFromMark(30, 45), 7.5)
  })

  it("opens padding on the side that faces the mark", () => {
    const metrics = diagramAtomMetrics()
    const below = diagramLabelPad("below")
    const above = diagramLabelPad("above")
    assert.equal(below.bottom, 0)
    assert.equal(below.top, metrics.boxPadFar)
    assert.equal(above.top, 0)
    assert.equal(above.bottom, metrics.boxPadFar)
    assert.equal(travelLabelAnchor("up"), "below")
    assert.equal(travelLabelAnchor("down"), "above")
  })

  it("keeps name-to-stroke distance the same for a tick and a circle", () => {
    const metrics = diagramAtomMetrics()
    const tickEdge = Math.round(markerCrossHalf("tick")) + 2
    const ringEdge = Math.round(markerCrossHalf("ring")) + 2
    assert.equal(labelClearanceGap(tickEdge) + tickEdge, metrics.lineClearance)
    assert.equal(labelClearanceGap(ringEdge) + ringEdge, metrics.lineClearance)
    assert.notEqual(tickEdge, ringEdge)
  })

  it("gives a through tick one side only, toward the name", () => {
    const metrics = diagramAtomMetrics()
    const through = tickCrossHalves("through")
    const terminus = tickCrossHalves("terminus")
    assert.equal(through.name, metrics.tickAcross / 2)
    assert.equal(through.flag, metrics.x / 2)
    assert.equal(terminus.name, metrics.tickAcross / 2)
    assert.equal(terminus.flag, metrics.tickAcross / 2)
  })

  it("lets the larger of line clearance and the mark's half-extent win, per side", () => {
    const metrics = diagramAtomMetrics()
    const flagHalf = markHalfForSide("tick", "through", "flag")
    const nameHalf = markHalfForSide("tick", "through", "name")
    assert.equal(flagHalf, metrics.x / 2)
    assert.equal(nameHalf, metrics.tickAcross / 2)
    assert.equal(markHalfForSide("ring", "through", "flag"), metrics.ringRadius)

    // Reconstruct the atoms.tsx total-clearance formula: `gap` is real flex
    // space from the padding box to the SVG edge, `pull` closes the rest
    // when the SVG lane is shallower than the mark's own clearance — the
    // padding edge lands at lineClearance for any lane depth either way.
    const totalFor = (markHalf: number, lane = Math.round(markHalf) + 2) => {
      const layout = labelClearanceLayout(lane, markHalf)
      return lane + layout.gap - layout.pull
    }
    const near = (value: number) =>
      assert.ok(Math.abs(value - metrics.lineClearance) < 1e-9)
    near(totalFor(flagHalf))
    near(totalFor(nameHalf))
    near(totalFor(nameHalf, metrics.ringRadius + 2))
    near(totalFor(200))
  })

  it("paints more pink under a tick than a circle while keeping one baseline", () => {
    const metrics = diagramAtomMetrics()
    const lane = metrics.ringRadius + 2
    const tick = labelClearanceLayout(lane, markHalfForSide("tick", "through", "name"))
    const ring = labelClearanceLayout(lane, metrics.ringRadius)
    assert.ok(Math.abs(lane + tick.gap - tick.pull - metrics.lineClearance) < 1e-9)
    assert.ok(Math.abs(lane + ring.gap - ring.pull - metrics.lineClearance) < 1e-9)
    assert.equal(tick.gap, ring.gap)
    assert.ok(tick.paintGap > ring.paintGap)
    assert.equal(tick.paintGap, metrics.lineClearance - markHalfForSide("tick", "through", "name"))
    assert.equal(ring.paintGap, metrics.lineClearance - metrics.ringRadius)
  })

  it("draws the mark's own clearance band flush against the mark rim", () => {
    const metrics = diagramAtomMetrics()
    // A deep SVG lane (edge far from the mark): band fills the full
    // lineClearance - markHalf, flush against the rim, none clipped.
    const near = markClearanceRect(100, 100, true, "near", metrics.ringRadius, 0, 30)
    assert.equal(near.y + near.height, 100 - metrics.ringRadius)
    assert.ok(Math.abs(near.height - (metrics.lineClearance - metrics.ringRadius)) < 1e-9)
    const far = markClearanceRect(100, 100, false, "far", metrics.x / 2, 1000, 30)
    assert.equal(far.x, 100 + metrics.x / 2)
    assert.ok(Math.abs(far.width - (metrics.lineClearance - metrics.x / 2)) < 1e-9)
  })

  it("clips the mark's clearance band at the SVG's own edge, never past it", () => {
    const metrics = diagramAtomMetrics()
    // A shallow SVG lane (mark 5 above its own edge, less than
    // lineClearance away): the band must stop at the SVG edge, not poke
    // past it into where the real (orange) flex gap already lives.
    const shallowCy = metrics.ringRadius + 5
    const near = markClearanceRect(100, shallowCy, true, "near", metrics.ringRadius, 0, 30)
    assert.equal(near.y, 0)
    assert.equal(near.height, 5)
    assert.ok(near.height < metrics.lineClearance - metrics.ringRadius)
  })

  it("bounds a cubic bend by its control-point hull, inflated by the stroke width", () => {
    const metrics = diagramAtomMetrics()
    const bend: Shape = {
      kind: "cubic",
      p0: { x: 0, y: 0 },
      p1: { x: 10, y: 0 },
      p2: { x: 20, y: -10 },
      p3: { x: 20, y: -20 },
      halfWidth: metrics.x / 2,
    }
    const box: Envelope = shapeEnvelope(bend)
    assert.equal(box.minX, 0 - metrics.x / 2)
    assert.equal(box.maxX, 20 + metrics.x / 2)
    assert.equal(box.minY, -20 - metrics.x / 2)
    assert.equal(box.maxY, 0 + metrics.x / 2)
    const ring: Shape = { kind: "circle", cx: 20, cy: -20, r: metrics.ringRadius }
    assert.equal(envelopesIntersect(box, shapeEnvelope(ring)), true)
    const farRing: Shape = { kind: "circle", cx: 200, cy: -200, r: metrics.ringRadius }
    assert.equal(envelopesIntersect(box, shapeEnvelope(farRing)), false)
    assert.deepEqual(envelopeOf([bend, ring]), {
      minX: Math.min(box.minX, 20 - metrics.ringRadius),
      maxX: Math.max(box.maxX, 20 + metrics.ringRadius),
      minY: Math.min(box.minY, -20 - metrics.ringRadius),
      maxY: Math.max(box.maxY, -20 + metrics.ringRadius),
    })
  })

  it("offsets a straight run into a rotated rectangle, not an axis-aligned box", () => {
    const rect = laneClearanceRect({ x: 0, y: 0 }, { x: 10, y: 0 }, 5, 2)
    assert.deepEqual(rect.points, [
      { x: -2, y: -5 },
      { x: 12, y: -5 },
      { x: 12, y: 5 },
      { x: -2, y: 5 },
    ])
    // A 45° run's clearance rect is rotated with it — no side stays level.
    const diag = laneClearanceRect({ x: 0, y: 0 }, { x: 10, y: 10 }, 5, 0)
    for (const [a, b] of [
      [diag.points[0], diag.points[1]],
      [diag.points[1], diag.points[2]],
    ] as const) {
      assert.notEqual(a.x, b.x)
      assert.notEqual(a.y, b.y)
    }
  })

  it("keeps the clearance band offset at least as wide as a bend's own bulge off the chord", () => {
    const metrics = diagramAtomMetrics()
    const clearance = metrics.lineClearance - metrics.x / 2
    // Every stem recipe's bend radius is at most tflBendRadius; a wider
    // radius bulges further off the chord, so this is the worst case —
    // the reason extending the straight run either side of a bend by the
    // bend radius is enough for the two rotated rects to cover it fully.
    const worstCase = headingBendCross(tflBendRadius(metrics), Math.PI / 4)
    assert.ok(
      clearance >= worstCase,
      `clearance ${clearance} < worst-case bend bulge ${worstCase}`
    )
  })

  it("gives every stem recipe one path-following clearance rect per straight sub-run", () => {
    const metrics = diagramAtomMetrics()
    for (const recipe of STEM_RECIPES) {
      const layout = layoutStem(recipe, true, metrics)
      const band = strokeClearanceBand(layout.spine, metrics)
      assert.equal(band.length, layout.spine.length, `${recipe.id} band/spine mismatch`)
      assert.ok(band.length > 0, `${recipe.id} has no spine runs`)
      for (const rect of band) assert.equal(rect.points.length, 4)
    }
  })

  it("keeps every stem recipe clear of minimumBranchGap once joined", () => {
    const metrics = diagramAtomMetrics()
    for (const recipe of STEM_RECIPES) {
      const layout = layoutStem(recipe, true, metrics, metrics.ringRadius)
      const gap = stemExitGap(layout.exitA, layout.exitB, metrics)
      assert.ok(
        gap >= minimumBranchGap(metrics) - 1e-6,
        `${recipe.id} only clears ${gap.toFixed(2)}px, needs ${minimumBranchGap(metrics)}`
      )
    }
  })

  it("never joins a ring where it would sit on its own bend", () => {
    const metrics = diagramAtomMetrics()
    for (const recipe of STEM_RECIPES) {
      const layout = layoutStem(recipe, true, metrics, metrics.ringRadius)
      const ringA = joinRingFromStem(layout.exitA, true, metrics)
      const ringB = joinRingFromStem(layout.exitB, true, metrics)
      const ringShape = (ring: { x: number; y: number }): Shape => ({
        kind: "circle",
        cx: ring.x,
        cy: ring.y,
        r: metrics.ringRadius,
      })
      if (layout.lastBendA) {
        assert.equal(
          envelopesIntersect(shapeEnvelope(layout.lastBendA), shapeEnvelope(ringShape(ringA))),
          false,
          `${recipe.id} upper ring sits on its own bend`
        )
      }
      if (layout.lastBendB) {
        assert.equal(
          envelopesIntersect(shapeEnvelope(layout.lastBendB), shapeEnvelope(ringShape(ringB))),
          false,
          `${recipe.id} lower ring sits on its own bend`
        )
      }
    }
  })

  it("gives a joined ring headroom inside the stem's own box", () => {
    const metrics = diagramAtomMetrics()
    for (const recipe of STEM_RECIPES) {
      const layout = layoutStem(recipe, true, metrics, metrics.ringRadius)
      assert.ok(layout.exitA.y - metrics.ringRadius >= 0, `${recipe.id} exitA pokes past the top`)
      assert.ok(layout.exitB.y - metrics.ringRadius >= 0, `${recipe.id} exitB pokes past the top`)
      assert.ok(
        layout.exitA.y + metrics.ringRadius <= layout.h,
        `${recipe.id} exitA pokes past the bottom`
      )
      assert.ok(
        layout.exitB.y + metrics.ringRadius <= layout.h,
        `${recipe.id} exitB pokes past the bottom`
      )
    }
  })

  it("caps a name at its own half of the run to a neighbour mark", () => {
    const m = diagramAtomMetrics()
    // Independent-corridors station↔boundary pitch (162) beside a ring:
    // a 134px one-line "Cannon Street" would sit across the midpoint and
    // under the interchange column; 122 forces the wrap.
    assert.equal(labelWidthBesideNeighbor(162, m.ringRadius, m), 122)
    assert.ok(labelWidthBesideNeighbor(162, m.ringRadius, m) < 134)
    assert.ok(labelWidthBesideNeighbor(162, m.ringRadius, m) > 72)
    assert.equal(labelWidthBesideNeighbor(400, m.ringRadius, m), m.labelMaxWidth)
  })

  it("grows a segment only when label boxes need the room", () => {
    const m = diagramAtomMetrics()
    const unlabeled = grownSegmentLength(
      markerAlongHalf("tick"),
      markerAlongHalf("tick")
    )
    assert.equal(unlabeled, m.minSegment)

    const left = stationAlongHalf(m.ringRadius, 120)
    const right = stationAlongHalf(markerAlongHalf("tick"), 80)
    assert.equal(left, 60)
    assert.equal(right, 40)
    assert.equal(grownSegmentLength(left, right), 60 + m.safeGap + 40)
  })

  it("grows the connecting stroke, not the station columns, when labels need room", () => {
    const m = diagramAtomMetrics()
    const box = diagramLabelBoxAlong()
    assert.equal(box, m.labelMaxWidth + m.boxPadX * 2)
    const leftSvg = stationSvgAlong("tick", "through")
    const rightSvg = stationSvgAlong("ring", "through")
    assert.equal(leftSvg, m.stub * 2)
    assert.equal(rightSvg, m.stub * 2)
    assert.equal(stationInwardAlong("tick", "through"), m.stub)
    const unlabeled = connectingStrokeLength(
      markerAlongHalf("tick"),
      markerAlongHalf("ring"),
      stationInwardAlong("tick", "through"),
      stationInwardAlong("ring", "through")
    )
    assert.equal(unlabeled, m.minSegment)
    const labeled = connectingStrokeLength(
      stationAlongHalf(markerAlongHalf("tick"), box),
      stationAlongHalf(markerAlongHalf("ring"), box),
      stationInwardAlong("tick", "through"),
      stationInwardAlong("ring", "through")
    )
    assert.ok(labeled > m.minSegment)
    assert.equal(
      labeled,
      grownSegmentLength(
        stationAlongHalf(markerAlongHalf("tick"), box),
        stationAlongHalf(markerAlongHalf("ring"), box)
      ) -
        m.stub -
        m.stub
    )
  })

  it("keeps the segment core at min length and puts leftover on each end", () => {
    const m = diagramAtomMetrics()
    assert.deepEqual(paintSegmentParts(m.minSegment), {
      core: m.minSegment,
      excessEach: 0,
    })
    assert.deepEqual(paintSegmentParts(m.minSegment + 20), {
      core: m.minSegment,
      excessEach: 10,
    })
  })

  it("keeps interchange bridge walls at the same 0.5x as the ring stroke", () => {
    const m = diagramAtomMetrics()
    const atPitch = interchangeLens(m.bondCentre)
    assert.equal(atPitch.neck, 15)
    assert.equal(atPitch.lens, 5)
    assert.equal((atPitch.neck - atPitch.lens) / 2, m.ringStroke)
    const farther = interchangeLens(m.gappedBond)
    assert.equal(farther.neck, 15)
    assert.equal(farther.lens, 5)
  })

  it("keeps octilinear cubic handles on the start and end headings", () => {
    const bend = octilinearCubic({ x: 0, y: 0 }, 0, Math.PI / 4, 30)
    assert.equal(bend.p1.y, 0)
    assert.ok(bend.p1.x > 0)
    assert.equal(bend.p0.x, Math.round(bend.p0.x))
    assert.equal(bend.p3.x, Math.round(bend.p3.x))
    assert.equal(bend.p3.y, Math.round(bend.p3.y))
    const outDx = bend.p3.x - bend.p2.x
    const outDy = bend.p3.y - bend.p2.y
    assert.ok(Math.abs(Math.abs(outDx) - Math.abs(outDy)) < 1e-9)
    const back = octilinearCubic({ x: 10, y: 10 }, Math.PI / 4, 0, 30)
    const inDx = back.p1.x - back.p0.x
    const inDy = back.p1.y - back.p0.y
    assert.ok(Math.abs(Math.abs(inDx) - Math.abs(inDy)) < 1e-9)
    assert.equal(back.p3.y, back.p2.y)
  })

  it("puts parallel tips on one cap plane", () => {
    assert.equal(stemTipPlane(40, 10, 0), 40)
    assert.equal(stemTipPlane(40, 10, -45), 50)
    assert.equal(stemTipPlane(40, -10, 45), 50)
    assert.equal(stemTipPlaneStep(0), 1)
    assert.equal(stemTipPlaneStep(-45), 2)
    assert.equal(stemTipHeading({ leave: 45, returnToAlong: true }), 0)
    assert.equal(stemTipHeading({ leave: 45, returnToAlong: false }), 45)
    assert.equal(stemTipHeading({ leave: 0, returnToAlong: false }), 0)
  })

  it("spaces parallel 45° stems by at least minimumBranchGap edge-to-edge", () => {
    const m = diagramAtomMetrics()
    const stagger = parallelStemStagger(m)
    const centreDistance = stagger / Math.SQRT2
    assert.ok(centreDistance - m.x >= minimumBranchGap(m) - 1e-6)
    assert.ok(centreDistance > m.x + m.x * 0.8)
  })

  it("caps a fork's own corner radius at the official curve, and at any nearby straight run", () => {
    const metrics = diagramAtomMetrics()
    assert.equal(safeForkRadius(1000, metrics), tflBendRadius(metrics))
    assert.equal(safeForkRadius(5, metrics), 5)
    assert.equal(safeForkRadius(1000, metrics, 12), 12)
    assert.equal(safeForkRadius(-5, metrics), 0)
  })

  it("generalises stemExitGap to any lane pitch, for a grid renderer that never calls layoutStem", () => {
    const metrics = diagramAtomMetrics()
    assert.equal(
      laneEdgeGap(metrics.gappedBond, metrics),
      stemExitGap({ x: 0, y: 0 }, { x: 0, y: metrics.gappedBond }, metrics)
    )
    // drawing-layout.ts's LANE_PITCH (48 at this scale) must still clear
    // the same official minimum a fixed-size demo stem clears.
    assert.ok(laneEdgeGap(48, metrics) >= minimumBranchGap(metrics))
  })

  it("bounds an arc-based octilinear S-bend without a cubic's control points", () => {
    const metrics = diagramAtomMetrics()
    const a = { x: 0, y: 0 }
    const b = { x: 72, y: 48 }
    const radius = 18
    const bulge = headingBendCross(radius, Math.PI / 4)
    const envelope = octilinearBendEnvelope(a, b, radius, metrics)
    assert.ok(Math.abs(envelope.minY - (-metrics.x / 2 - bulge)) < 1e-9)
    assert.ok(Math.abs(envelope.maxY - (48 + metrics.x / 2 + bulge)) < 1e-9)
    // A mark planted well off the chord clears; one planted right on the
    // straight line between the two points does not — same decision a
    // cubic bend's own envelope makes, just with no control points to hull.
    assert.equal(
      octilinearBendClearsMark(a, b, radius, { x: 36, y: -100 }, metrics.ringRadius, metrics),
      true
    )
    assert.equal(
      octilinearBendClearsMark(a, b, radius, { x: 36, y: 24 }, metrics.ringRadius, metrics),
      false
    )
  })

  it("lists octilinear stem recipes from a horizontal incoming", () => {
    assert.equal(STEM_RECIPES.length, 6)
    const ids = STEM_RECIPES.map((recipe) => recipe.id)
    assert.deepEqual(ids, [
      "y-return",
      "y-diagonal",
      "peel-up",
      "peel-down",
      "peel-up-stay",
      "both-down",
    ])
    assert.ok(STEM_RECIPES.every((recipe) => recipe.upper && recipe.lower))
  })

  it("gives a connected tick and circle the same integer paint lane", () => {
    assert.equal(markerLane("tick", true), markerLane("ring", true))
    assert.notEqual(markerLane("tick"), markerLane("ring"))
    const lane = markerLane("tick", true)
    const metrics = diagramAtomMetrics()
    assert.equal(labelClearanceGap(lane) + lane, metrics.lineClearance)
  })

  it("anchors names to the ring column, not the stem bbox", () => {
    const stem = layoutStem(STEM_RECIPES[0]!)
    const metrics = diagramAtomMetrics()
    const ring = joinRingFromStem(stem.exitA, true, metrics)
    const shift = labelShiftFromMark(ring.x, stem.w + throughJoinAlong(metrics) + metrics.stub)
    assert.notEqual(shift, 0)
    assert.equal(ring.x + -shift, (stem.w + throughJoinAlong(metrics) + metrics.stub) / 2)
  })

  it("only overlaps a through-stroke onto the already-horizontal return", () => {
    const metrics = diagramAtomMetrics()
    const stem = layoutStem(STEM_RECIPES[0]!)
    assert.ok(stem.flatA)
    assert.ok(stem.flatB)
    assert.equal(stem.flatA.start.y, stem.flatA.end.y)
    assert.equal(stem.flatB.start.y, stem.flatB.end.y)
    const run = stem.flatA.end.x - stem.flatA.start.x
    assert.ok(run >= returnFlatRun(metrics) - 1)
    const ring = joinRingFromStem(stem.exitA, true, metrics)
    const blackStart = ring.x - metrics.stub
    assert.equal(blackStart, stem.exitA.x - STROKE_JOIN)
    assert.ok(blackStart >= stem.flatA.start.x)
    assert.ok(blackStart < stem.flatA.end.x)
  })

  it("tucks the interchange bridge under gapped rings", () => {
    const metrics = diagramAtomMetrics()
    const a = { x: 0, y: 0 }
    const b = { x: 0, y: metrics.gappedBond }
    const box = interchangeBondBox(a, b, metrics)
    assert.equal(box.vertical, true)
    assert.ok(box.neck.height < metrics.gappedBond)
    assert.ok(box.neck.height > 2 * metrics.ringStroke)
    assert.equal(box.lens.width, 5)
  })

  it("keeps both bridges of a triple interchange clear of the shared middle ring", () => {
    const metrics = diagramAtomMetrics()
    // Three rings at the official pitch: `interchangeBondBox` only ever
    // sees one pair at a time, so nothing stops two independently-tucked
    // bridges from creeping past the ring they share — this is the check
    // that catches it.
    const centres = [0, 1, 2].map((i) => ({ x: 0, y: i * metrics.gappedBond }))
    const first = interchangeBondBox(centres[0]!, centres[1]!, metrics)
    const second = interchangeBondBox(centres[1]!, centres[2]!, metrics)
    assert.equal(first.vertical, true)
    assert.equal(second.vertical, true)
    const sharedCentre = centres[1]!.y
    const firstEnd = first.neck.y + first.neck.height
    const secondStart = second.neck.y
    assert.ok(
      firstEnd <= sharedCentre,
      `first bridge's neck (ends at ${firstEnd}) reaches past the shared ring's own centre (${sharedCentre})`
    )
    assert.ok(
      secondStart >= sharedCentre,
      `second bridge's neck (starts at ${secondStart}) starts before the shared ring's own centre (${sharedCentre})`
    )
    assert.ok(
      firstEnd <= secondStart,
      "the two bridges' necks overlap under the shared middle ring"
    )
    // Both necks still tuck fully under the ring they share, same as the
    // double-interchange case above — a triple doesn't shrink the tuck.
    assert.ok(firstEnd > sharedCentre - metrics.ringRadius)
    assert.ok(secondStart < sharedCentre + metrics.ringRadius)
  })

  it("places labels perpendicular to the stroke at lineClearance", () => {
    const metrics = diagramAtomMetrics()
    assert.deepEqual(labelAwayFromStroke("up", 10, 40), {
      x: 10,
      y: 40 - metrics.lineClearance,
    })
  })

  it("sizes nameCrossHalf from lineClearance plus real text rows, growing with maxLines", () => {
    const metrics = diagramAtomMetrics()
    const oneLine = nameCrossHalf(1, metrics)
    const twoLines = nameCrossHalf(2, metrics)
    assert.equal(oneLine, metrics.lineClearance + metrics.nameSize * 1.35)
    assert.equal(twoLines, metrics.lineClearance + metrics.nameSize * 1.35 * 2)
    assert.ok(twoLines > oneLine)
  })

  it("lands buildStemArmPath's flat run exactly on the required tip, for any grid pitch", () => {
    const metrics = diagramAtomMetrics()
    const mapPt = (p: Pt): Pt => p
    for (const tipCross of [-48, -24, 24, 48, 90]) {
      const { spine } = buildStemArmPath(
        { forkAlong: 8, tipAlong: 90, tipCross },
        mapPt,
        metrics
      )
      const tip = spine.at(-1)!.b
      assert.equal(tip.x, 90, `tipAlong for tipCross=${tipCross}`)
      assert.ok(
        Math.abs(tip.y - tipCross) < 1e-6,
        `tipCross for tipCross=${tipCross}: got ${tip.y}`
      )
    }
  })

  it("gives buildStemArmPath two bends and a diagonal, matching layoutStem's own recipe shape", () => {
    const metrics = diagramAtomMetrics()
    const mapPt = (p: Pt): Pt => p
    const { d, spine } = buildStemArmPath(
      { forkAlong: 8, tipAlong: 90, tipCross: 48 },
      mapPt,
      metrics
    )
    const cubics = [...d.matchAll(/C /g)]
    assert.equal(cubics.length, 2, d)
    // lead-in, diagonal, flat run — three straight sub-runs either side
    // of the two bends, the same shape strokeClearanceBand expects.
    assert.equal(spine.length, 3, JSON.stringify(spine))
  })

  it("collapses buildStemArmPath to a straight run when the tip needs no diverge", () => {
    const metrics = diagramAtomMetrics()
    const mapPt = (p: Pt): Pt => p
    const { d, spine } = buildStemArmPath(
      { forkAlong: 8, tipAlong: 90, tipCross: 0 },
      mapPt,
      metrics
    )
    assert.doesNotMatch(d, /C /)
    assert.equal(spine.length, 2)
    assert.equal(spine.at(-1)!.b.x, 90)
  })

  it("never paints a bend's own curve as excess — only the straight runs either side flex", () => {
    const metrics = diagramAtomMetrics()
    const mapPt = (p: Pt): Pt => p
    const { segs } = buildStemArmPath(
      { forkAlong: 8, tipAlong: 90, tipCross: 48 },
      mapPt,
      metrics
    )
    // Two bends (lead+bend0 fused into one "core" run, bend1 alone),
    // two straight "excess" runs (the diagonal, then the flat run to
    // the tip) — never a "C" command inside an "excess"-painted seg.
    const excess = segs.filter((seg) => seg.paint === "excess")
    assert.equal(excess.length, 2, JSON.stringify(segs))
    for (const seg of excess) assert.doesNotMatch(seg.d, /C /, seg.d)
    const core = segs.filter((seg) => seg.paint === "core")
    assert.equal(core.length, 2, JSON.stringify(segs))
    for (const seg of core) assert.match(seg.d, /C /, seg.d)
  })

  it("sits a triangle's name on the bounding-box centre, not the base column", () => {
    const { a, b, apex } = triangleInterchangeCentres({ x: 100, y: 80 })
    const at = bondedGroupLabelAt([a, b, apex], "up")
    assert.equal(at.x, (Math.min(a.x, b.x, apex.x) + Math.max(a.x, b.x, apex.x)) / 2)
    assert.equal(at.y, Math.min(a.y, b.y, apex.y))
    const column = bondedGroupLabelAt(
      [
        { x: 40, y: 20 },
        { x: 40, y: 58 },
      ],
      "up"
    )
    assert.equal(column.x, 40)
    assert.equal(column.y, 20)
  })

  it("places a bonded triangle's three rings at gappedBond, apex along travel", () => {
    const metrics = diagramAtomMetrics()
    const origin = { x: 100, y: 80 }
    const { a, b, apex } = triangleInterchangeCentres(origin, true, metrics)
    assert.equal(a.x, b.x)
    assert.equal(Math.abs(b.y - a.y), metrics.gappedBond)
    assert.equal(apex.x - origin.x, triangleApexAlong(metrics))
    assert.equal(apex.y, origin.y)
    const dist = (p: Pt, q: Pt) => Math.hypot(q.x - p.x, q.y - p.y)
    for (const [p, q] of [
      [a, b],
      [a, apex],
      [b, apex],
    ] as const) {
      assert.ok(
        Math.abs(dist(p, q) - metrics.gappedBond) < 1.5,
        `side ${dist(p, q)} vs gappedBond ${metrics.gappedBond}`
      )
    }
    const fromBase = triangleApexFromBase(a, b, { x: a.x + 100, y: a.y })
    assert.deepEqual(fromBase, apex)
  })

  it("rotates a diagonal interchange bond so the neck follows the centres", () => {
    const metrics = diagramAtomMetrics()
    const { a, apex } = triangleInterchangeCentres({ x: 0, y: 0 }, true, metrics)
    const box = interchangeBondBox(a, apex, metrics)
    assert.ok(box.angle != null, "diagonal bond should carry a rotation")
    assert.ok(box.origin)
    const dist = Math.hypot(apex.x - a.x, apex.y - a.y)
    assert.ok(box.neck.width < dist)
    assert.ok(box.neck.width > 2 * metrics.ringStroke)
    assert.equal(box.lens.height, 5)
  })

  it("draws a U-bend as one 180° arc, not two arms meeting at a nose", () => {
    const metrics = diagramAtomMetrics()
    const tipA = { x: 40, y: 20 }
    const tipB = { x: 40, y: 20 + metrics.gappedBond }
    const arc = uBendBetween(tipA, tipB, { x: 80, y: 40 })
    assert.equal(arc.tipA.x, arc.tipB.x)
    assert.equal(arc.nose.y, (tipA.y + tipB.y) / 2)
    assert.ok(arc.nose.x > tipA.x, "bowl sits on the constrained side")
    assert.ok(Math.abs(arc.radius - metrics.gappedBond / 2) < 1e-6)
    assert.match(arc.d, /A /)
    assert.doesNotMatch(arc.d, /C /)
    assert.equal((arc.d.match(/A /g) ?? []).length, 1)
    const u = layoutUBend(true, metrics)
    assert.equal(u.tipA.x, u.tipB.x)
    assert.ok(u.nose.x > u.tipA.x)
    const span = Math.hypot(u.tipB.x - u.tipA.x, u.tipB.y - u.tipA.y)
    assert.ok(span / 2 >= minimumUBendRadius(metrics) - 1e-6)
    assert.ok(Math.abs(span - uBendPitch(metrics)) < 1e-6)
    const gap = stemExitGap(u.tipA, u.tipB, metrics)
    assert.ok(gap >= minimumBranchGap(metrics) - 1e-6)
    const arcs = u.segs.filter((seg) => /A /.test(seg.d))
    assert.equal(arcs.length, 1, "one semicircle, not a Y")
    assert.equal(arcs[0]!.paint, "core")
    assert.ok(u.segs.every((seg) => !/C /.test(seg.d)))
  })

  it("lands stemArmFromTo on the required tip, matching a fork arm", () => {
    const metrics = diagramAtomMetrics()
    const from = { x: 40, y: 80 }
    const to = { x: 130, y: 32 }
    const { spine } = stemArmFromTo(from, to, "x", metrics)
    const tip = spine.at(-1)!.b
    assert.ok(Math.abs(tip.x - to.x) < 1e-6)
    assert.ok(Math.abs(tip.y - to.y) < 1e-6)
  })

  it("keeps a short, non-diverging buildStemArmPath arm entirely core, no excess sliver", () => {
    const metrics = diagramAtomMetrics()
    const mapPt = (p: Pt): Pt => p
    const { segs } = buildStemArmPath(
      { forkAlong: 8, tipAlong: 8 + metrics.x, tipCross: 0 },
      mapPt,
      metrics
    )
    assert.equal(segs.length, 1)
    assert.equal(segs[0]!.paint, "core")
  })
})
