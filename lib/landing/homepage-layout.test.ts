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

  it("names the hosted product as an arrivals and status board", () => {
    const chat = read("../../components/landing/landing-room-chat.tsx")
    const home = read("../../components/landing/agent-readable-home.tsx")
    assert.match(chat, /arrivals and status board/)
    assert.match(chat, /Make my own arrivals board/)
    assert.doesNotMatch(chat, />\s*Board\s*</)
    assert.doesNotMatch(chat, /It&apos;s a live TfL board/)
    assert.match(home, /Arrivals and status board/)
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
