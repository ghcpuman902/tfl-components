import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { SITE_URL } from "@/lib/site"
import { ROUTE_PAGE_META } from "@/lib/site-metadata"
import { BOARD_VIEW_PATH } from "@/lib/tfl/board-url-state"
import {
  BOARD_VIEW_APPLE_WEB_APP,
  BOARD_VIEW_DISPLAY_MODES,
  BOARD_VIEW_ICON_192_PATH,
  BOARD_VIEW_ICON_512_PATH,
  BOARD_VIEW_MANIFEST,
  BOARD_VIEW_MANIFEST_PATH,
  BOARD_VIEW_VIEWPORT,
  isStartUrlInScope,
  manifestIssuesAtLevel,
  validateWebAppManifest,
} from "./board-view-manifest"

describe("board view web app manifest", () => {
  it("has no validation errors", () => {
    const serialized = JSON.stringify(BOARD_VIEW_MANIFEST)
    const parsed: unknown = JSON.parse(serialized)
    const issues = validateWebAppManifest(parsed)
    assert.deepEqual(manifestIssuesAtLevel(issues, "error"), [])
    assert.deepEqual(manifestIssuesAtLevel(issues, "warning"), [])
  })

  it("reopens the rendered board fullscreen from the home screen", () => {
    assert.equal(BOARD_VIEW_MANIFEST.display, "fullscreen")
    assert.deepEqual(BOARD_VIEW_MANIFEST.display_override, [
      "fullscreen",
      "standalone",
    ])
    assert.equal(BOARD_VIEW_MANIFEST.start_url, BOARD_VIEW_PATH)
    assert.equal(BOARD_VIEW_MANIFEST.scope, BOARD_VIEW_PATH)
    assert.equal(
      isStartUrlInScope(
        BOARD_VIEW_MANIFEST.start_url,
        BOARD_VIEW_MANIFEST.scope
      ),
      true
    )
    assert.equal(BOARD_VIEW_APPLE_WEB_APP.capable, true)
    assert.equal(BOARD_VIEW_VIEWPORT.viewportFit, "cover")
  })

  it("stays on the board view path and never includes a key", () => {
    assert.equal(BOARD_VIEW_MANIFEST_PATH, `${BOARD_VIEW_PATH}/manifest.webmanifest`)
    assert.equal(BOARD_VIEW_MANIFEST.id, `${SITE_URL}${BOARD_VIEW_PATH}`)
    const urlFields = [
      BOARD_VIEW_MANIFEST.id,
      BOARD_VIEW_MANIFEST.start_url,
      BOARD_VIEW_MANIFEST.scope,
      ...BOARD_VIEW_MANIFEST.icons.map((icon) => icon.src),
    ]
    for (const field of urlFields) {
      assert.doesNotMatch(field, /[?#]/)
      assert.doesNotMatch(field, /key=/i)
    }
    assert.doesNotMatch(JSON.stringify(BOARD_VIEW_MANIFEST), /key=/i)
    assert.equal(
      BOARD_VIEW_MANIFEST.description,
      ROUTE_PAGE_META.boardView.description
    )
  })

  it("ships square 192 and 512 PNG icons", () => {
    const sizes = BOARD_VIEW_MANIFEST.icons.map((icon) => icon.sizes)
    assert.deepEqual(sizes, ["192x192", "512x512"])
    assert.equal(BOARD_VIEW_MANIFEST.icons[0]?.src, BOARD_VIEW_ICON_192_PATH)
    assert.equal(BOARD_VIEW_MANIFEST.icons[1]?.src, BOARD_VIEW_ICON_512_PATH)
    for (const icon of BOARD_VIEW_MANIFEST.icons) {
      assert.equal(icon.type, "image/png")
      assert.match(icon.src, /^\/board\/view\/icon\/\d+$/)
    }
  })

  it("reports errors for an invalid manifest", () => {
    const issues = validateWebAppManifest({
      name: "",
      display: "window",
      start_url: "/docs",
      scope: BOARD_VIEW_PATH,
      theme_color: "not-a-colour",
      icons: [{ src: "", sizes: "64x32" }],
    })
    const errors = manifestIssuesAtLevel(issues, "error")
    assert.ok(errors.includes("Manifest needs a non-empty name or short_name."))
    assert.ok(
      errors.includes(
        "Manifest display must be fullscreen, standalone, minimal-ui, or browser."
      )
    )
    assert.ok(errors.includes("Manifest start_url is outside scope."))
    assert.ok(errors.includes("Manifest theme_color must be a hex colour."))
    assert.ok(errors.includes("Manifest icons[0] is missing src."))
    assert.ok(errors.includes("Manifest icons[0] must be square."))
    assert.ok(errors.includes("Manifest needs a 192x192 icon."))
    assert.ok(errors.includes("Manifest needs a 512x512 icon."))
    assert.ok(BOARD_VIEW_DISPLAY_MODES.includes("fullscreen"))
  })

  it("rejects a start_url that would leak a key", () => {
    const issues = validateWebAppManifest({
      ...BOARD_VIEW_MANIFEST,
      start_url: `${BOARD_VIEW_PATH}#key=secret`,
    })
    assert.ok(
      manifestIssuesAtLevel(issues, "error").includes(
        "Manifest start_url must not include a key."
      )
    )
  })
})
