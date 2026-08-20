import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, it } from "node:test"

const root = dirname(fileURLToPath(import.meta.url))

describe("docs localhost demo crop", () => {
  it("keeps browser chrome and fades a height-limited preview", () => {
    const source = readFileSync(
      join(root, "../components/docs/browser-window.tsx"),
      "utf8"
    )
    const docsPage = readFileSync(join(root, "../app/docs/page.tsx"), "utf8")

    assert.match(source, /localhost:3000/)
    assert.match(source, /previewLimit/)
    assert.match(source, /max-h-80/)
    assert.match(source, /bg-linear-to-t from-background/)
    assert.match(source, /View full example/)
    assert.doesNotMatch(source, /scale-\[/)
    assert.doesNotMatch(source, /origin-top/)
    assert.match(docsPage, /previewLimit/)
    assert.match(docsPage, /fullExampleHref/)
  })
})
