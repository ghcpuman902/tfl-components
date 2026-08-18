import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  createStressState,
  orientToGeo,
  settleStressLayout,
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
    const short = Math.hypot(state.x[1]! - state.x[0]!, state.y[1]! - state.y[0]!)
    const long = Math.hypot(state.x[2]! - state.x[1]!, state.y[2]! - state.y[1]!)
    assert.ok(long > short * 2, `long ${long.toFixed(1)} vs short ${short.toFixed(1)}`)
  })
})
