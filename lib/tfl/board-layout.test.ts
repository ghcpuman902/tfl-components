import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { boardGlanceGutterCss } from "./board-layout"

describe("boardGlanceGutterCss", () => {
  it("uses max() of a minimum gutter and safe-area insets", () => {
    assert.deepEqual(boardGlanceGutterCss(20), {
      paddingTop: "max(20px, env(safe-area-inset-top, 0px))",
      paddingRight: "max(20px, env(safe-area-inset-right, 0px))",
      paddingBottom: "max(20px, env(safe-area-inset-bottom, 0px))",
      paddingLeft: "max(20px, env(safe-area-inset-left, 0px))",
    })
  })
})
