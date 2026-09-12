import assert from "node:assert/strict"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, it } from "node:test"
import {
  isDocsHref,
  NAVIGATION_SHELL_DELAY_MS,
  shouldShowNavigationShell,
} from "./navigation-pending"

const root = dirname(fileURLToPath(import.meta.url))

const collectPageDirs = (dir: string, acc: string[] = []) => {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (!statSync(full).isDirectory()) continue
    if (name.startsWith(".")) continue
    try {
      if (statSync(join(full, "page.tsx")).isFile()) acc.push(full)
    } catch {
      // folder has no page.tsx
    }
    collectPageDirs(full, acc)
  }
  return acc
}

describe("navigation pending shell", () => {
  it("waits 150ms before showing a click-time shell", () => {
    assert.equal(NAVIGATION_SHELL_DELAY_MS, 150)
  })

  it("tracks in-app path changes and ignores hashes or the current page", () => {
    assert.equal(shouldShowNavigationShell("/docs/bus-arrivals", "/docs"), true)
    assert.equal(
      shouldShowNavigationShell("/docs/tube-rail-arrivals", "/docs/bus-arrivals"),
      true
    )
    assert.equal(shouldShowNavigationShell("/docs", "/docs"), false)
    assert.equal(shouldShowNavigationShell("/docs#try-it", "/docs"), false)
    assert.equal(shouldShowNavigationShell("https://example.com", "/docs"), false)
    assert.equal(shouldShowNavigationShell("//evil.example", "/docs"), false)
  })

  it("treats every /docs path as a docs shell", () => {
    assert.equal(isDocsHref("/docs"), true)
    assert.equal(isDocsHref("/docs/tube-rail-arrivals"), true)
    assert.equal(isDocsHref("/board"), false)
  })
})

describe("docs leaf loading shells", () => {
  it("gives every docs page folder its own loading.tsx", () => {
    const docsRoot = join(root, "../app/docs")
    const pageDirs = collectPageDirs(docsRoot)
    assert.ok(pageDirs.length > 10)

    const missing = pageDirs.filter((dir) => {
      try {
        statSync(join(dir, "loading.tsx"))
        return false
      } catch {
        return true
      }
    })

    assert.deepEqual(
      missing.map((dir) => dir.slice(docsRoot.length)),
      []
    )
  })

  it("keeps the shared article shell free of time and randomness", () => {
    const loading = readFileSync(
      join(root, "../components/docs/docs-route-loading.tsx"),
      "utf8"
    )
    assert.match(loading, /export const DocsRouteLoading/)
    assert.doesNotMatch(loading, /Date\.now\(|new Date\(|Math\.random\(/)
  })
})
