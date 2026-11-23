import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
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
  // cn() drops CHIP_CAP_TEXT_BOX_CLASS's `leading-none` once a font-size
  // class follows it, so every size has to carry `/none` itself.
  for (const [letter, size] of [
    ["K", "md"],
    ["RG", "md"],
    ["K", "sm"],
    ["RG", "sm"],
  ] as const) {
    it(`keeps line-height 1 for ${size} ${letter}`, () => {
      const cls = glyphClass(letter, size)
      assert.match(cls, /(?:^|\s)text-\[[^\]]+\]\/none(?:\s|$)/, cls)
      assert.match(cls, /\[text-box:trim-both_cap_alphabetic\]/, cls)
    })
  }
})
