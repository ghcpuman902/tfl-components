import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  STRESS_BOND_GAP,
  createStressState,
  finishStressLayout,
  orientToGeo,
  segmentsCross,
  settleStressLayout,
  untangleHubLegs,
  type StressGraph,
} from "./stress-layout"

const turnDegrees = (
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number
): number => {
  const abx = bx - ax
  const aby = by - ay
  const bcx = cx - bx
  const bcy = cy - by
  const dot = abx * bcx + aby * bcy
  const denom = Math.hypot(abx, aby) * Math.hypot(bcx, bcy) || 1
  const cos = Math.min(1, Math.max(-1, dot / denom))
  return (Math.acos(cos) * 180) / Math.PI
}

describe("stress majorization layout", () => {
  it("recovers a 90° rotation without flipping geography", () => {
    const geoX = [0, 10, 20, 10]
    const geoY = [0, 0, 0, -8]
    const x = geoY.map((value) => -value)
    const y = [...geoX]
    orientToGeo(x, y, geoX, geoY)
    assert.ok(x[2]! > x[0]!, "east stays east")
    assert.ok(y[3]! < y[1]!, "south stays south")
  })

  it("un-mirrors two parallel branches so the eastern corridor stays east", () => {
    // Geography: west corridor left, east corridor right, shared north/south.
    const geoX = [0, -12, -12, 0, 12, 12]
    const geoY = [10, 4, -4, -10, 4, -4]
    // Layout is that figure reflected in x — rotation alone cannot fix it.
    const x = geoX.map((value) => -value)
    const y = [...geoY]
    orientToGeo(x, y, geoX, geoY)
    assert.ok(x[1]! < x[0]!, "west corridor stays west of the north join")
    assert.ok(x[4]! > x[0]!, "east corridor stays east of the north join")
    assert.ok(y[3]! < y[0]!, "south join stays south")
  })

  it("straightens a wiggly corridor and keeps west-to-east order", () => {
    const graph: StressGraph = {
      ids: ["a", "b", "c", "d", "e"],
      edges: [
        { from: "a", to: "b" },
        { from: "b", to: "c" },
        { from: "c", to: "d" },
        { from: "d", to: "e" },
      ],
      geo: [
        { x: 0, y: 0 },
        { x: 10, y: 8 },
        { x: 20, y: -7 },
        { x: 30, y: 9 },
        { x: 40, y: 1 },
      ],
    }
    const state = createStressState(graph)
    settleStressLayout(state, { steps: 60 })

    const turnB = turnDegrees(
      state.x[0]!,
      state.y[0]!,
      state.x[1]!,
      state.y[1]!,
      state.x[2]!,
      state.y[2]!
    )
    const turnC = turnDegrees(
      state.x[1]!,
      state.y[1]!,
      state.x[2]!,
      state.y[2]!,
      state.x[3]!,
      state.y[3]!
    )
    const turnD = turnDegrees(
      state.x[2]!,
      state.y[2]!,
      state.x[3]!,
      state.y[3]!,
      state.x[4]!,
      state.y[4]!
    )

    assert.ok(turnB < 12, `B turn ${turnB.toFixed(1)}°`)
    assert.ok(turnC < 12, `C turn ${turnC.toFixed(1)}°`)
    assert.ok(turnD < 12, `D turn ${turnD.toFixed(1)}°`)
    assert.ok(state.x[4]! > state.x[0]!, "east terminus stays east of west")
  })

  it("keeps a Y-junction from collapsing onto one corridor", () => {
    const graph: StressGraph = {
      ids: ["w", "j", "e", "s"],
      edges: [
        { from: "w", to: "j" },
        { from: "j", to: "e" },
        { from: "j", to: "s" },
      ],
      geo: [
        { x: 0, y: 0 },
        { x: 20, y: 1 },
        { x: 40, y: 0 },
        { x: 22, y: -18 },
      ],
    }
    const state = createStressState(graph)
    settleStressLayout(state, { steps: 60 })

    const jx = state.x[1]!
    const jy = state.y[1]!
    const toE = Math.hypot(state.x[2]! - jx, state.y[2]! - jy)
    const toS = Math.hypot(state.x[3]! - jx, state.y[3]! - jy)
    const eToS = Math.hypot(
      state.x[2]! - state.x[3]!,
      state.y[2]! - state.y[3]!
    )

    assert.ok(eToS > toE * 0.7, "south branch stays off the east corridor")
    assert.ok(toS > toE * 0.5, "south spoke keeps length")
    assert.ok(state.x[2]! > state.x[0]!, "east stays east of west")
  })

  it("straightens permitted Y movements and leaves the unsupported turn sharp", () => {
    const graph: StressGraph = {
      ids: ["trunk", "j", "upper", "lower"],
      edges: [
        { from: "trunk", to: "j" },
        { from: "j", to: "upper" },
        { from: "j", to: "lower" },
      ],
      straightThrough: [
        { from: "trunk", via: "j", to: "upper" },
        { from: "trunk", via: "j", to: "lower" },
      ],
      geo: [
        { x: 0, y: 0 },
        { x: 20, y: 0 },
        { x: 34, y: -18 },
        { x: 34, y: 18 },
      ],
    }
    const state = createStressState(graph)
    settleStressLayout(state, { steps: 120 })

    const permittedUpper = turnDegrees(
      state.x[0]!,
      state.y[0]!,
      state.x[1]!,
      state.y[1]!,
      state.x[2]!,
      state.y[2]!
    )
    const permittedLower = turnDegrees(
      state.x[0]!,
      state.y[0]!,
      state.x[1]!,
      state.y[1]!,
      state.x[3]!,
      state.y[3]!
    )
    const unsupported = turnDegrees(
      state.x[2]!,
      state.y[2]!,
      state.x[1]!,
      state.y[1]!,
      state.x[3]!,
      state.y[3]!
    )

    assert.ok(permittedUpper < 35, `upper turn ${permittedUpper.toFixed(1)}°`)
    assert.ok(permittedLower < 35, `lower turn ${permittedLower.toFixed(1)}°`)
    assert.ok(unsupported > 90, `unsupported turn ${unsupported.toFixed(1)}°`)
  })

  it("swings a hub leg across the station when that removes a crossing", () => {
    const graph: StressGraph = {
      ids: ["camden", "chalk", "kentish", "mc", "bank", "cx"],
      edges: [
        { from: "camden", to: "chalk" },
        { from: "camden", to: "kentish" },
        { from: "camden", to: "mc" },
        { from: "camden", to: "bank" },
        { from: "mc", to: "cx" },
      ],
      bondLinks: [{ a: "bank", b: "cx" }],
      geo: [
        { x: 0, y: 0 },
        { x: -12, y: 16 },
        { x: 10, y: 16 },
        { x: 8, y: -10 },
        { x: 3, y: -16 },
        { x: -8, y: -16 },
      ],
    }
    const state = createStressState(graph)
    state.x = [0, -12, 10, 8, 3, -8]
    state.y = [0, 16, 16, -10, -16, -16]
    const crossing = () =>
      segmentsCross(
        state.x[0]!,
        state.y[0]!,
        state.x[4]!,
        state.y[4]!,
        state.x[3]!,
        state.y[3]!,
        state.x[5]!,
        state.y[5]!
      )
    assert.ok(
      crossing(),
      "precondition: Mornington Crescent crosses the Bank trunk"
    )
    // The bank/CX bond and the Camden hub have to resolve this together —
    // untangling Camden's legs alone can leave CX on the wrong side of its
    // own bonded half, and the bond swap alone can leave Camden's legs
    // crossed. finishStressLayout runs both, repeatedly, same as production.
    finishStressLayout(state)
    assert.equal(
      crossing(),
      false,
      "crossing resolved once bond and hub cooperate"
    )
  })

  it("carries a whole branch across the hub, not just its first station", () => {
    // Chalk Farm and Kentish Town both have further stations beyond them —
    // a single-node mirror would flip the near station and strand the rest,
    // which majorization then drags straight back on the next settle.
    const graph: StressGraph = {
      ids: ["camden", "chalk", "belsize", "kentish", "tufnell", "south"],
      edges: [
        { from: "camden", to: "chalk" },
        { from: "chalk", to: "belsize" },
        { from: "camden", to: "kentish" },
        { from: "kentish", to: "tufnell" },
        { from: "camden", to: "south" },
      ],
      geo: [
        { x: 0, y: 0 },
        { x: -3, y: 10 },
        { x: 9, y: 22 },
        { x: 4, y: 11 },
        { x: -10, y: 24 },
        { x: 0, y: -16 },
      ],
    }
    const state = createStressState(graph)
    // The two branches swoop past each other near the hub.
    state.x = [0, -3, 9, 4, -10, 0]
    state.y = [0, 10, 22, 11, 24, -16]

    const chalkOffset = () => ({
      dx: state.x[2]! - state.x[1]!,
      dy: state.y[2]! - state.y[1]!,
    })
    const kentishOffset = () => ({
      dx: state.x[4]! - state.x[3]!,
      dy: state.y[4]! - state.y[3]!,
    })
    const crossing = () =>
      segmentsCross(
        state.x[1]!,
        state.y[1]!,
        state.x[2]!,
        state.y[2]!,
        state.x[3]!,
        state.y[3]!,
        state.x[4]!,
        state.y[4]!
      )
    const chalkBefore = chalkOffset()
    const kentishBefore = kentishOffset()
    assert.ok(crossing(), "precondition: the branches cross near the hub")

    for (let pass = 0; pass < 4; pass += 1) untangleHubLegs(state)

    assert.equal(crossing(), false, "flip removed the crossing")
    const chalkAfter = chalkOffset()
    const kentishAfter = kentishOffset()
    // A mirror preserves each branch's own shape: the y-offset from anchor
    // to child never changes, and the x-offset only ever flips sign. If
    // Belsize Park or Tufnell Park had been left behind, these would drift.
    assert.ok(
      Math.abs(chalkAfter.dy - chalkBefore.dy) < 1e-6 &&
        Math.abs(Math.abs(chalkAfter.dx) - Math.abs(chalkBefore.dx)) < 1e-6,
      "Chalk Farm's branch kept its shape — Belsize Park followed, it wasn't left behind"
    )
    assert.ok(
      Math.abs(kentishAfter.dy - kentishBefore.dy) < 1e-6 &&
        Math.abs(Math.abs(kentishAfter.dx) - Math.abs(kentishBefore.dx)) < 1e-6,
      "Kentish Town's branch kept its shape — Tufnell Park followed, it wasn't left behind"
    )
  })

  it("flips a crossing-free bonded fork onto its geographic side", () => {
    // Euston: Bank is east, Charing Cross is west. The fork never crosses
    // in either handedness — hop-distance stress is silent, so only geo
    // can put Bank on the right.
    const graph: StressGraph = {
      ids: ["camden", "eustonA", "eustonB", "bank", "cx"],
      edges: [
        { from: "camden", to: "eustonA" },
        { from: "camden", to: "eustonB" },
        { from: "eustonA", to: "bank" },
        { from: "eustonB", to: "cx" },
      ],
      bondLinks: [{ a: "eustonA", b: "eustonB" }],
      geo: [
        { x: 0, y: 16 },
        { x: 2, y: 0 },
        { x: -2, y: 0 },
        { x: 12, y: -16 },
        { x: -12, y: -16 },
      ],
    }
    const state = createStressState(graph)
    // Dots sit on top of each other, like a real bonded station — a slot
    // swap only moves them by the bond gap and leaves the corridors put.
    state.x = [0, -1, 1, -12, 12]
    state.y = [16, 0, 0, -16, -16]
    assert.ok(
      state.x[3]! < state.x[4]!,
      "precondition: Bank is drawn west of CX"
    )
    settleStressLayout(state, { steps: 80 })
    assert.ok(
      state.x[3]! > state.x[4]!,
      "Bank (east) should sit to the right of Charing Cross (west)"
    )
  })

  it("flips a bonded pair when the current side makes exclusive legs cross", () => {
    const graph: StressGraph = {
      ids: ["west", "a", "b", "east"],
      edges: [
        { from: "west", to: "a" },
        { from: "east", to: "b" },
      ],
      bondLinks: [{ a: "a", b: "b" }],
      geo: [
        { x: -40, y: 0 },
        { x: -6, y: 0 },
        { x: 6, y: 0 },
        { x: 40, y: 0 },
      ],
    }
    const state = createStressState(graph)
    // Wrong side: a sits on the east, b on the west, so west—a crosses east—b.
    state.x[0] = -40
    state.y[0] = 12
    state.x[1] = 12
    state.y[1] = -8
    state.x[2] = -12
    state.y[2] = -8
    state.x[3] = 40
    state.y[3] = 12
    assert.ok(
      segmentsCross(
        state.x[0]!,
        state.y[0]!,
        state.x[1]!,
        state.y[1]!,
        state.x[3]!,
        state.y[3]!,
        state.x[2]!,
        state.y[2]!
      ),
      "precondition: exclusive legs cross"
    )
    settleStressLayout(state, { steps: 80 })
    assert.equal(
      segmentsCross(
        state.x[0]!,
        state.y[0]!,
        state.x[1]!,
        state.y[1]!,
        state.x[3]!,
        state.y[3]!,
        state.x[2]!,
        state.y[2]!
      ),
      false,
      "wrong-side crossing should be penalised away"
    )
  })

  it("keeps a bonded split pair close while its far ends settle like any other hop", () => {
    const graph: StressGraph = {
      ids: ["west", "a", "b", "east"],
      edges: [
        { from: "west", to: "a" },
        { from: "a", to: "east" },
        { from: "west", to: "b" },
        { from: "b", to: "east" },
      ],
      bondLinks: [{ a: "a", b: "b" }],
      geo: [
        { x: -40, y: 0 },
        { x: 0, y: 3 },
        { x: 0, y: -3 },
        { x: 40, y: 0 },
      ],
    }
    const state = createStressState(graph)
    settleStressLayout(state, { steps: 120 })

    const gap = Math.hypot(state.x[1]! - state.x[2]!, state.y[1]! - state.y[2]!)
    assert.ok(
      Math.abs(gap - STRESS_BOND_GAP) < 1,
      `bonded pair gap ${gap.toFixed(1)} should settle near ${STRESS_BOND_GAP}`
    )
    const toWest = Math.hypot(
      state.x[0]! - state.x[1]!,
      state.y[0]! - state.y[1]!
    )
    assert.ok(
      toWest > STRESS_BOND_GAP * 3,
      "the pair still separates normally from its own far neighbours"
    )
  })

  it("makes a longer scheduled hop occupy more layout length", () => {
    const graph: StressGraph = {
      ids: ["a", "b", "c"],
      edges: [
        { from: "a", to: "b", length: 1 },
        { from: "b", to: "c", length: 3 },
      ],
      geo: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 20, y: 0 },
      ],
    }
    const state = createStressState(graph)
    settleStressLayout(state, { steps: 80 })
    const short = Math.hypot(
      state.x[1]! - state.x[0]!,
      state.y[1]! - state.y[0]!
    )
    const long = Math.hypot(
      state.x[2]! - state.x[1]!,
      state.y[2]! - state.y[1]!
    )
    assert.ok(
      long > short * 2,
      `long ${long.toFixed(1)} vs short ${short.toFixed(1)}`
    )
  })
})
