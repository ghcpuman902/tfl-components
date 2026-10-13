import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  BOARD_SQUARE_ASPECT_MIN,
  BOARD_SQUARE_MIN_SIDE_PX,
  boardSquareGutterCss,
  resolveBoardLayout,
} from "./board-layout"

describe("resolveBoardLayout", () => {
  it("honours explicit layout=square over a tall phone viewport", () => {
    assert.equal(
      resolveBoardLayout({
        width: 390,
        height: 844,
        hoverNone: true,
        pointerCoarse: true,
        explicitLayout: "square",
      }),
      "square"
    )
  })

  it("honours explicit layout=default on a square coarse viewport", () => {
    assert.equal(
      resolveBoardLayout({
        width: 1088,
        height: 1088,
        hoverNone: true,
        pointerCoarse: true,
        explicitLayout: "default",
      }),
      "default"
    )
  })

  it("auto-detects a HomeView-sized square coarse display", () => {
    assert.equal(
      resolveBoardLayout({
        width: 1088,
        height: 1088,
        hoverNone: true,
        pointerCoarse: true,
      }),
      "square"
    )
  })

  it("auto-detects a near-square coarse display within the aspect band", () => {
    const height = 1088
    const width = Math.ceil(height * BOARD_SQUARE_ASPECT_MIN)
    assert.equal(
      resolveBoardLayout({
        width,
        height,
        hoverNone: true,
        pointerCoarse: true,
      }),
      "square"
    )
  })

  it("does not auto-detect phones (tall aspect)", () => {
    assert.equal(
      resolveBoardLayout({
        width: 390,
        height: 844,
        hoverNone: true,
        pointerCoarse: true,
      }),
      "default"
    )
  })

  it("does not auto-detect phone landscape", () => {
    assert.equal(
      resolveBoardLayout({
        width: 844,
        height: 390,
        hoverNone: true,
        pointerCoarse: true,
      }),
      "default"
    )
  })

  it("does not auto-detect iPad split-view halves", () => {
    // ~50% of an 11" iPad landscape content area — not near-square.
    assert.equal(
      resolveBoardLayout({
        width: 595,
        height: 834,
        hoverNone: true,
        pointerCoarse: true,
      }),
      "default"
    )
  })

  it("does not auto-detect hover-capable pointers (desktop / trackpad iPad)", () => {
    assert.equal(
      resolveBoardLayout({
        width: 1088,
        height: 1088,
        hoverNone: false,
        pointerCoarse: true,
      }),
      "default"
    )
    assert.equal(
      resolveBoardLayout({
        width: 1088,
        height: 1088,
        hoverNone: true,
        pointerCoarse: false,
      }),
      "default"
    )
  })

  it("does not auto-detect squares smaller than the min side", () => {
    const side = BOARD_SQUARE_MIN_SIDE_PX - 1
    assert.equal(
      resolveBoardLayout({
        width: side,
        height: side,
        hoverNone: true,
        pointerCoarse: true,
      }),
      "default"
    )
  })

  it("returns default for zero or negative dimensions", () => {
    assert.equal(
      resolveBoardLayout({
        width: 0,
        height: 1088,
        hoverNone: true,
        pointerCoarse: true,
      }),
      "default"
    )
  })
})

describe("boardSquareGutterCss", () => {
  it("uses max() of a minimum gutter and safe-area insets", () => {
    assert.deepEqual(boardSquareGutterCss(20), {
      paddingTop: "max(20px, env(safe-area-inset-top, 0px))",
      paddingRight: "max(20px, env(safe-area-inset-right, 0px))",
      paddingBottom: "max(20px, env(safe-area-inset-bottom, 0px))",
      paddingLeft: "max(20px, env(safe-area-inset-left, 0px))",
    })
  })
})
