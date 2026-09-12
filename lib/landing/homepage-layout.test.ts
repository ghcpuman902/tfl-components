import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, it } from "node:test"

const root = dirname(fileURLToPath(import.meta.url))

const read = (relative: string) => readFileSync(join(root, relative), "utf8")

describe("homepage iPad preview layout", () => {
  it("sizes board columns from the scaled iPad frame, not the viewport", () => {
    const display = read("../../components/board/board-display.tsx")
    assert.match(display, /@container\/board/)
    assert.match(display, /@min-\[48rem\]\/board:grid-cols-3/)
    assert.doesNotMatch(display, /md:grid-cols-3/)
    assert.doesNotMatch(display, /md:col-span-2/)
  })

  it("keeps Board as the hosted product, separate from arrivals and status boards", () => {
    const chat = read("../../components/landing/landing-room-chat.tsx")
    const home = read("../../components/landing/agent-readable-home.tsx")
    assert.match(chat, /arrivals boards, status boards/)
    assert.match(chat, />\s*Board\s*</)
    assert.match(chat, /It&apos;s a dashboard/)
    assert.match(chat, /Make my own Board/)
    assert.doesNotMatch(chat, /arrivals and status board/)
    assert.doesNotMatch(chat, /It&apos;s a live TfL board/)
    assert.match(home, /title: "Board"/)
    assert.match(home, /arrivals boards, status boards/)
    assert.doesNotMatch(home, /Arrivals and status board/)
  })

  it("full-bleeds the landing stage past the scrollbar gutter", () => {
    const scene = read("../../app/temp/landing-hero/landing-scene.tsx")
    const fallback = read("../../components/landing/landing-page.tsx")
    const css = read("../../app/globals.css")
    assert.match(scene, /landing-hero-stage/)
    assert.match(fallback, /landing-hero-stage/)
    assert.match(css, /landing-hero-stage/)
    assert.match(css, /margin-left:\s*calc\(50% - 50vw\)/)
    assert.match(css, /scrollbar-gutter:\s*auto/)
  })
})
