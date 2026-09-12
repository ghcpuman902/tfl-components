import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, it } from "node:test"
import {
  applyThemeColorMeta,
  resolveStoredThemePreference,
  resolvedThemeFromPreference,
  shouldLockThemeColor,
  SITE_VIEWPORT_THEME_COLOR,
  THEME_COLOR_DARK,
  THEME_COLOR_DARK_MEDIA,
  THEME_COLOR_LIGHT,
  THEME_COLOR_LIGHT_MEDIA,
  THEME_STORAGE_KEY,
  themeColorBootScript,
  themeColorForResolved,
} from "./theme-color"

const root = dirname(fileURLToPath(import.meta.url))

const read = (relative: string) => readFileSync(join(root, relative), "utf8")

type FakeMeta = {
  name: string
  media: string | null
  content: string
  getAttribute: (key: string) => string | null
  setAttribute: (key: string, value: string) => void
  remove: () => void
}

const createFakeMeta = (init?: {
  media?: string | null
  content?: string
}): FakeMeta => {
  const meta: FakeMeta = {
    name: "theme-color",
    media: init?.media ?? null,
    content: init?.content ?? "",
    getAttribute: (key) => {
      if (key === "media") return meta.media
      if (key === "content") return meta.content
      if (key === "name") return meta.name
      return null
    },
    setAttribute: (key, value) => {
      if (key === "media") meta.media = value
      if (key === "content") meta.content = value
      if (key === "name") meta.name = value
    },
    remove: () => {
      const index = doc.metas.indexOf(meta)
      if (index >= 0) doc.metas.splice(index, 1)
    },
  }
  return meta
}

const doc = {
  metas: [] as FakeMeta[],
  querySelectorAll: (selectors: string) => {
    assert.equal(selectors, 'meta[name="theme-color"]')
    return doc.metas
  },
  createElement: (tagName: "meta") => {
    assert.equal(tagName, "meta")
    return createFakeMeta()
  },
  head: {
    appendChild: (node: FakeMeta) => {
      doc.metas.push(node)
    },
  },
}

const assertLockedMetas = (color: string) => {
  assert.equal(doc.metas.length, 3)
  assert.deepEqual(
    doc.metas.map((meta) => ({
      media: meta.getAttribute("media"),
      content: meta.getAttribute("content"),
    })),
    [
      { media: THEME_COLOR_LIGHT_MEDIA, content: color },
      { media: THEME_COLOR_DARK_MEDIA, content: color },
      { media: null, content: color },
    ]
  )
}

describe("theme-color", () => {
  it("maps resolved themes to the header background hexes", () => {
    assert.equal(themeColorForResolved("light"), THEME_COLOR_LIGHT)
    assert.equal(themeColorForResolved("dark"), THEME_COLOR_DARK)
    assert.equal(THEME_COLOR_LIGHT, "#ffffff")
    assert.equal(THEME_COLOR_DARK, "#0a0a0a")
  })

  it("treats only an explicit light or dark store as a lock", () => {
    assert.equal(resolveStoredThemePreference("light"), "light")
    assert.equal(resolveStoredThemePreference("dark"), "dark")
    assert.equal(resolveStoredThemePreference("system"), "system")
    assert.equal(resolveStoredThemePreference(null), "system")
    assert.equal(shouldLockThemeColor("light"), true)
    assert.equal(shouldLockThemeColor("dark"), true)
    assert.equal(shouldLockThemeColor("system"), false)
  })

  it("resolves system from prefers-color-scheme and explicit choices as-is", () => {
    assert.equal(resolvedThemeFromPreference("system", true), "dark")
    assert.equal(resolvedThemeFromPreference("system", false), "light")
    assert.equal(resolvedThemeFromPreference("light", true), "light")
    assert.equal(resolvedThemeFromPreference("dark", false), "dark")
  })

  it("rewrites light and dark media tags to the same locked colour", () => {
    doc.metas = [
      createFakeMeta({
        media: THEME_COLOR_LIGHT_MEDIA,
        content: THEME_COLOR_LIGHT,
      }),
      createFakeMeta({
        media: THEME_COLOR_DARK_MEDIA,
        content: THEME_COLOR_DARK,
      }),
    ]

    applyThemeColorMeta(THEME_COLOR_LIGHT, doc)

    assertLockedMetas(THEME_COLOR_LIGHT)
  })

  it("preserves React-owned tags while adding missing variants", () => {
    const existing = createFakeMeta({ content: THEME_COLOR_LIGHT })
    doc.metas = [existing]

    applyThemeColorMeta(THEME_COLOR_DARK, doc)

    assert.equal(doc.metas.includes(existing), true)
    assert.equal(existing.content, THEME_COLOR_DARK)
    assert.equal(doc.metas.length, 3)
  })

  it("never removes metadata managed by the Next.js head", () => {
    assert.doesNotMatch(applyThemeColorMeta.toString(), /\.remove\(/)
    assert.doesNotMatch(themeColorBootScript, /\.remove\(/)
  })
})

describe("theme-color wiring", () => {
  it("covers older iOS theme-color tags and iOS 26 sticky-header sampling", () => {
    const layout = read("../app/layout.tsx")
    const provider = read("../components/theme-provider.tsx")
    const header = read("../components/site-header.tsx")
    const css = read("../app/globals.css")

    assert.match(layout, /SITE_VIEWPORT_THEME_COLOR/)
    assert.match(layout, /viewportFit:\s*"cover"/)
    assert.match(layout, /themeColorBootScript/)
    assert.match(layout, /id="tfl-theme-color"/)
    assert.match(themeColorBootScript, new RegExp(THEME_STORAGE_KEY))
    assert.match(themeColorBootScript, /localStorage\.getItem/)
    assert.match(themeColorBootScript, /prefers-color-scheme/)
    assert.deepEqual(
      SITE_VIEWPORT_THEME_COLOR.map((entry) => entry.color),
      [THEME_COLOR_LIGHT, THEME_COLOR_DARK]
    )
    assert.match(provider, /ThemeColorSync/)
    assert.match(provider, /applyThemeColorMeta/)
    assert.match(provider, /useLayoutEffect/)
    assert.match(header, /bg-background pt-\[env\(safe-area-inset-top/)
    assert.doesNotMatch(header, /bg-background\/60 backdrop-blur/)
    assert.match(css, /@apply bg-background font-sans/)
    assert.match(css, /safe-area-inset-top/)
  })
})
