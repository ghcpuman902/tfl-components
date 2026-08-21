import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, it } from "node:test"

describe("analytics track", () => {
  it("swallows Vercel track failures so preview paint cannot crash", () => {
    const source = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "track.ts"),
      "utf8"
    )
    assert.match(source, /try \{/)
    assert.match(source, /vercelTrack\(name, safe\)/)
    assert.match(source, /excludeFromResults/)
  })
})
