import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { CHIP_CAP_SHIM_CLASS } from "@/components/tfl/arrivals/chip-text"
import {
  StopLetterBadge,
  type StopLetterBadgeSize,
} from "@/components/tfl/arrivals/stop-letter-badge"

const glyphClass = (letter: string, size: StopLetterBadgeSize): string => {
  const html = renderToStaticMarkup(
    createElement(StopLetterBadge, { letter, size })
  )
  const inner = /<span[^>]*><span class="([^"]*)"/.exec(html)
  assert.ok(inner, html)
  return inner[1]!
}

describe("StopLetterBadge glyph line-height", () => {
  // cn() drops a `leading-none` that comes before a font-size class, so
  // every size carries `/none` itself; the cap shim assumes line-height 1.
  for (const [letter, size] of [
    ["K", "md"],
    ["RG", "md"],
    ["K", "sm"],
    ["RG", "sm"],
  ] as const) {
    it(`keeps line-height 1 and the cap shim for ${size} ${letter}`, () => {
      const cls = glyphClass(letter, size)
      assert.match(cls, /(?:^|\s)text-\[[^\]]+\]\/none(?:\s|$)/, cls)
      for (const shim of CHIP_CAP_SHIM_CLASS.split(" "))
        assert.ok(cls.split(" ").includes(shim), cls)
    })
  }
})
