/**
 * Web app manifest for every `/board/view` — interactive and unattended.
 * Add to Home Screen must reopen the rendered board fullscreen with no
 * browser chrome and no status bar (Android `display: fullscreen`; iOS
 * falls back to standalone + a translucent status bar). Never include a
 * TfL key.
 */

import { SITE_URL } from "@/lib/site"
import { BOARD_VIEW_PATH } from "@/lib/tfl/board-url-state"

export const BOARD_VIEW_MANIFEST_PATH = `${BOARD_VIEW_PATH}/manifest.webmanifest`
export const BOARD_VIEW_ICON_192_PATH = `${BOARD_VIEW_PATH}/icon/192`
export const BOARD_VIEW_ICON_512_PATH = `${BOARD_VIEW_PATH}/icon/512`

export const BOARD_VIEW_MANIFEST_NAME = "Board display"
export const BOARD_VIEW_MANIFEST_SHORT_NAME = "Board"

export const BOARD_VIEW_DISPLAY_MODES = [
  "fullscreen",
  "standalone",
  "minimal-ui",
  "browser",
] as const

export type BoardViewDisplayMode = (typeof BOARD_VIEW_DISPLAY_MODES)[number]

export type BoardViewManifestIcon = {
  src: string
  sizes: string
  type: string
  purpose: "any" | "maskable" | "monochrome"
}

export type BoardViewWebAppManifest = {
  id: string
  name: string
  short_name: string
  description: string
  lang: string
  dir: "ltr"
  start_url: string
  scope: string
  display: BoardViewDisplayMode
  display_override: readonly BoardViewDisplayMode[]
  orientation: "any"
  background_color: string
  theme_color: string
  icons: readonly BoardViewManifestIcon[]
  categories: readonly string[]
}

export type ManifestIssue = {
  level: "error" | "warning"
  message: string
}

const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/
const ICON_SIZE = /^(\d+)x(\d+)$/

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const isDisplayMode = (value: unknown): value is BoardViewDisplayMode =>
  typeof value === "string" &&
  (BOARD_VIEW_DISPLAY_MODES as readonly string[]).includes(value)

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0

const manifestDocumentUrl = `${SITE_URL}${BOARD_VIEW_MANIFEST_PATH}`

export const resolveManifestUrl = (
  value: string,
  base = manifestDocumentUrl
): URL | null => {
  try {
    return new URL(value, base)
  } catch {
    return null
  }
}

/** W3C start_url-within-scope check (same origin, path prefix). */
export const isStartUrlInScope = (
  startUrl: string,
  scope: string,
  base = manifestDocumentUrl
): boolean => {
  const start = resolveManifestUrl(startUrl, base)
  const scopeUrl = resolveManifestUrl(scope, base)
  if (!start || !scopeUrl) return false
  if (start.origin !== scopeUrl.origin) return false
  const scopePath = scopeUrl.pathname.endsWith("/")
    ? scopeUrl.pathname
    : `${scopeUrl.pathname}/`
  return start.pathname === scopeUrl.pathname || start.pathname.startsWith(scopePath)
}

const push = (
  issues: ManifestIssue[],
  level: ManifestIssue["level"],
  message: string
) => {
  issues.push({ level, message })
}

/**
 * Validate a Web App Manifest enough to catch Chrome / spec errors:
 * empty name, bad display, start_url outside scope, missing 192/512 icons,
 * invalid colours, and secrets in URL fields.
 */
export const validateWebAppManifest = (value: unknown): ManifestIssue[] => {
  const issues: ManifestIssue[] = []
  if (!isRecord(value)) {
    push(issues, "error", "Manifest must be a JSON object.")
    return issues
  }

  if (!isNonEmptyString(value.name) && !isNonEmptyString(value.short_name)) {
    push(issues, "error", "Manifest needs a non-empty name or short_name.")
  } else {
    if (!isNonEmptyString(value.name)) {
      push(issues, "warning", "Manifest is missing name.")
    }
    if (!isNonEmptyString(value.short_name)) {
      push(issues, "warning", "Manifest is missing short_name.")
    }
  }

  if (value.display === undefined) {
    push(issues, "warning", "Manifest is missing display; browsers default to browser.")
  } else if (!isDisplayMode(value.display)) {
    push(
      issues,
      "error",
      "Manifest display must be fullscreen, standalone, minimal-ui, or browser."
    )
  }

  if (value.display_override !== undefined) {
    if (!Array.isArray(value.display_override) || value.display_override.length === 0) {
      push(issues, "error", "Manifest display_override must be a non-empty array.")
    } else if (!value.display_override.every(isDisplayMode)) {
      push(
        issues,
        "error",
        "Manifest display_override entries must be valid display modes."
      )
    }
  }

  if (!isNonEmptyString(value.start_url)) {
    push(issues, "error", "Manifest needs a start_url.")
  } else if (!resolveManifestUrl(value.start_url)) {
    push(issues, "error", "Manifest start_url is not a valid URL.")
  }

  if (value.scope !== undefined) {
    if (!isNonEmptyString(value.scope)) {
      push(issues, "error", "Manifest scope must be a non-empty string when set.")
    } else if (!resolveManifestUrl(value.scope)) {
      push(issues, "error", "Manifest scope is not a valid URL.")
    } else if (
      isNonEmptyString(value.start_url) &&
      !isStartUrlInScope(value.start_url, value.scope)
    ) {
      push(issues, "error", "Manifest start_url is outside scope.")
    }
  }

  for (const field of ["id", "start_url", "scope"] as const) {
    const raw = value[field]
    if (typeof raw !== "string") continue
    if (/(?:^|[?&#])key=/i.test(raw)) {
      push(issues, "error", `Manifest ${field} must not include a key.`)
    }
  }

  if (value.theme_color !== undefined && !isNonEmptyString(value.theme_color)) {
    push(issues, "error", "Manifest theme_color must be a non-empty string when set.")
  } else if (
    typeof value.theme_color === "string" &&
    !HEX_COLOR.test(value.theme_color)
  ) {
    push(issues, "error", "Manifest theme_color must be a hex colour.")
  }

  if (
    value.background_color !== undefined &&
    !isNonEmptyString(value.background_color)
  ) {
    push(
      issues,
      "error",
      "Manifest background_color must be a non-empty string when set."
    )
  } else if (
    typeof value.background_color === "string" &&
    !HEX_COLOR.test(value.background_color)
  ) {
    push(issues, "error", "Manifest background_color must be a hex colour.")
  }

  if (!Array.isArray(value.icons) || value.icons.length === 0) {
    push(issues, "error", "Manifest needs at least one icon.")
  } else {
    const sizes = new Set<string>()
    for (const [index, icon] of value.icons.entries()) {
      if (!isRecord(icon)) {
        push(issues, "error", `Manifest icons[${index}] must be an object.`)
        continue
      }
      if (!isNonEmptyString(icon.src)) {
        push(issues, "error", `Manifest icons[${index}] is missing src.`)
      } else if (!resolveManifestUrl(icon.src)) {
        push(issues, "error", `Manifest icons[${index}] src is not a valid URL.`)
      }
      if (!isNonEmptyString(icon.sizes) || !ICON_SIZE.test(icon.sizes)) {
        push(
          issues,
          "error",
          `Manifest icons[${index}] needs a sizes value such as 192x192.`
        )
      } else {
        sizes.add(icon.sizes)
        const match = ICON_SIZE.exec(icon.sizes)
        if (match && match[1] !== match[2]) {
          push(issues, "error", `Manifest icons[${index}] must be square.`)
        }
      }
      if (!isNonEmptyString(icon.type)) {
        push(issues, "warning", `Manifest icons[${index}] is missing type.`)
      }
    }
    if (!sizes.has("192x192")) {
      push(issues, "error", "Manifest needs a 192x192 icon.")
    }
    if (!sizes.has("512x512")) {
      push(issues, "error", "Manifest needs a 512x512 icon.")
    }
  }

  return issues
}

export const manifestIssuesAtLevel = (
  issues: readonly ManifestIssue[],
  level: ManifestIssue["level"]
): readonly string[] => issues.filter((issue) => issue.level === level).map((issue) => issue.message)

export const BOARD_VIEW_MANIFEST = {
  id: `${SITE_URL}${BOARD_VIEW_PATH}`,
  name: BOARD_VIEW_MANIFEST_NAME,
  short_name: BOARD_VIEW_MANIFEST_SHORT_NAME,
  description:
    "Full-screen station display set from the Board builder. Configuration stays in the page URL.",
  lang: "en-GB",
  dir: "ltr",
  start_url: BOARD_VIEW_PATH,
  scope: BOARD_VIEW_PATH,
  display: "fullscreen",
  display_override: ["fullscreen", "standalone"],
  orientation: "any",
  background_color: "#0a0a0a",
  theme_color: "#0a0a0a",
  icons: [
    {
      src: BOARD_VIEW_ICON_192_PATH,
      sizes: "192x192",
      type: "image/png",
      purpose: "any",
    },
    {
      src: BOARD_VIEW_ICON_512_PATH,
      sizes: "512x512",
      type: "image/png",
      purpose: "any",
    },
  ],
  categories: ["travel", "utilities"],
} as const satisfies BoardViewWebAppManifest

/** iOS cannot hide the status bar; translucent is the no-opaque-bar mode. */
export const BOARD_VIEW_APPLE_WEB_APP = {
  capable: true,
  title: BOARD_VIEW_MANIFEST_SHORT_NAME,
  statusBarStyle: "black-translucent",
} as const

export const BOARD_VIEW_VIEWPORT = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0a0a",
} as const

export const BOARD_VIEW_MANIFEST_HEADERS = {
  "Content-Type": "application/manifest+json; charset=utf-8",
  "Cache-Control": "public, max-age=3600",
} as const
