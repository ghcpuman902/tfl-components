/**
 * Generate TfL colour CSS tokens from published brand-colours RGB.
 *
 * Emits:
 * - `app/tfl-colours.css` (docs site + local consumption)
 * - `cssVars` + `css` on the `tfl-colours` item in `registry.json`
 *
 * Run via `pnpm registry:build` (or directly with `tsx`).
 */

import { readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import {
  OVERGROUND_LINE_COLOURS,
  TFL_BLUE,
  TFL_MODAL_COLOURS,
  UNDERGROUND_LINE_COLOURS,
  type BrandColourSpec,
} from "../lib/tfl/brand-colours"
import {
  parseHex,
  parseRgbChannels,
  srgbToOklchCss,
} from "../lib/tfl/colour-formats"
import {
  darkOklchFromBrandSpec,
  northernDarkOklch,
  NORTHERN_DARK_HEX,
} from "../lib/tfl/dark-line-colours"
import { RIVER_BUS_LINE_IDS } from "../lib/tfl/river-bus"
import { resolveRouteTrackStyle } from "../lib/tfl/route-track"
import { REGISTRY_BASE } from "../lib/site"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, "..")
export const COLOUR_TOKENS_CSS_PATH = join(ROOT, "app/tfl-colours.css")
export const COLOUR_TOKENS_REGISTRY_PATH = join(ROOT, "registry.json")
export const COLOURS_REGISTRY_URL = `${REGISTRY_BASE}/tfl-colours.json`

const WHITE_OKLCH = "oklch(100% 0 0)"
const BLACK_OKLCH = "oklch(0% 0 0)"
const TFL_BLUE_OKLCH = srgbToOklchCss(parseHex(TFL_BLUE))
const NORTHERN_DARK_OKLCH = northernDarkOklch()

/** Large-print B&W map key greys — ink/paper swap in `.dark`. */
const MONO_INK_OKLCH = srgbToOklchCss(parseHex("#202020"))
const MONO_PAPER_OKLCH = WHITE_OKLCH
const MONO_GREY_OKLCH = srgbToOklchCss(parseHex("#96999b"))
const MONO_LIGHT_OKLCH = srgbToOklchCss(parseHex("#b8babc"))

/**
 * Northern dark default = Go light fill (`#FCFCFC`), not brand black.
 * Halo / stroke opt-in keeps brand black — see `data-tfl-northern="halo"`.
 */
const DARK_EXCEPTIONS: Record<string, { color: string; ink: string }> = {
  northern: { color: NORTHERN_DARK_OKLCH, ink: BLACK_OKLCH },
}

type TokenKind = "line" | "mode"

export type ColourToken = {
  /** CSS custom property name without `--` (e.g. `tfl-line-central`). */
  varName: string
  kind: TokenKind
  /** Primary data-line id (first binding). */
  primaryId: string
  /** `data-line` attribute values that bind to this token. */
  dataLineIds: string[]
  oklch: string
  /** Chip text on this fill. White unless `stripText` is TfL blue. */
  inkOklch: string
  /** Dark-map OKLCH (brand + Go night method, or Northern light fill). */
  darkOklch: string
  darkInkOklch: string
}

const inkFromSpec = (spec: BrandColourSpec): string => {
  if (spec.stripText === TFL_BLUE) return TFL_BLUE_OKLCH
  return WHITE_OKLCH
}

const oklchFromSpec = (spec: BrandColourSpec): string =>
  srgbToOklchCss(parseRgbChannels(spec.rgb))

/**
 * CamelCase brand key → kebab data-line id.
 * Known compounds (dialARide, hammersmithCity) become dial-a-ride / hammersmith-city.
 */
const toDataLineId = (key: string): string =>
  key
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .toLowerCase()

/** Extra aliases so API / docs ids resolve without per-call maps. */
const DATA_LINE_ALIASES: Record<string, string[]> = {
  elizabeth: ["elizabeth-line"],
  trams: ["tram"],
  "cable-car": ["london-cable-car"],
  river: [...RIVER_BUS_LINE_IDS, "river-bus"],
}

export const buildColourTokens = (): ColourToken[] => {
  const tokens: ColourToken[] = []

  const push = (kind: TokenKind, key: string, spec: BrandColourSpec): void => {
    const id = toDataLineId(key)
    const varName = `tfl-${kind}-${id}`
    const exception = DARK_EXCEPTIONS[id]
    tokens.push({
      varName,
      kind,
      primaryId: id,
      dataLineIds: [id, ...(DATA_LINE_ALIASES[id] ?? [])],
      oklch: oklchFromSpec(spec),
      inkOklch: inkFromSpec(spec),
      darkOklch: exception?.color ?? darkOklchFromBrandSpec(spec),
      darkInkOklch: exception?.ink ?? inkFromSpec(spec),
    })
  }

  for (const [key, spec] of Object.entries(UNDERGROUND_LINE_COLOURS)) {
    push("line", key, spec)
  }
  for (const [key, spec] of Object.entries(OVERGROUND_LINE_COLOURS)) {
    push("line", key, spec)
  }
  for (const [key, spec] of Object.entries(TFL_MODAL_COLOURS)) {
    push("mode", key, spec)
  }

  return tokens
}

type CssVarsPayload = {
  theme: Record<string, string>
  light: Record<string, string>
  dark: Record<string, string>
}

type CssPayload = Record<string, unknown>

export type ColourTokensArtefacts = {
  cssText: string
  cssVars: CssVarsPayload
  css: CssPayload
}

export const buildColourTokensArtefacts = (
  tokens: ColourToken[] = buildColourTokens()
): ColourTokensArtefacts => {
  const light: Record<string, string> = {}
  const dark: Record<string, string> = {}
  const theme: Record<string, string> = {}

  for (const token of tokens) {
    light[token.varName] = token.oklch
    dark[token.varName] = token.darkOklch
    theme[`color-${token.varName}`] = `var(--${token.varName})`
  }

  const central = tokens.find((token) => token.varName === "tfl-line-central")
  if (central) {
    light["tfl-diagram-cable-car"] = central.oklch
    dark["tfl-diagram-cable-car"] = central.darkOklch
    theme["color-tfl-diagram-cable-car"] = "var(--tfl-diagram-cable-car)"
  }

  light["tfl-mono-ink"] = MONO_INK_OKLCH
  light["tfl-mono-paper"] = MONO_PAPER_OKLCH
  light["tfl-mono-grey"] = MONO_GREY_OKLCH
  light["tfl-mono-light"] = MONO_LIGHT_OKLCH
  dark["tfl-mono-ink"] = MONO_PAPER_OKLCH
  dark["tfl-mono-paper"] = MONO_INK_OKLCH
  dark["tfl-mono-grey"] = MONO_GREY_OKLCH
  dark["tfl-mono-light"] = MONO_LIGHT_OKLCH
  theme["color-tfl-mono-ink"] = "var(--tfl-mono-ink)"
  theme["color-tfl-mono-paper"] = "var(--tfl-mono-paper)"
  theme["color-tfl-mono-grey"] = "var(--tfl-mono-grey)"
  theme["color-tfl-mono-light"] = "var(--tfl-mono-light)"

  const bindingRules: Record<string, Record<string, string>> = {}
  const diagramCableCarIds: string[] = []
  for (const token of tokens) {
    for (const id of token.dataLineIds) {
      const rule: Record<string, string> = {
        "--line-raw": `var(--${token.varName})`,
      }
      if (token.inkOklch !== WHITE_OKLCH) {
        rule["--line-ink"] = token.inkOklch
      }
      const strokeStyle = resolveRouteTrackStyle(id)
      if (strokeStyle !== "solid") {
        rule["--line-stroke-style"] = strokeStyle
      }
      if (strokeStyle === "cable-car") {
        diagramCableCarIds.push(id)
      }
      bindingRules[`[data-line='${id}']`] = rule
    }
  }

  const diagramBindingSelector = diagramCableCarIds
    .map((id) => `[data-line='${id}'][data-tfl-diagram]`)
    .join(", ")

  const css: CssPayload = {
    "@layer base": {
      "[data-line]": {
        "--line-color": "var(--line-raw)",
        "--line-ink": WHITE_OKLCH,
        "--line-stroke-style": "solid",
      },
      ...bindingRules,
    },
    ".dark [data-line='northern']": {
      "--line-ink": BLACK_OKLCH,
    },
    "@media (prefers-contrast: more) and (not (forced-colors: active))": {
      "[data-line]": {
        "--line-color": "oklch(from var(--line-raw) calc(l * 0.82) c h)",
      },
    },
    "@media (prefers-contrast)": {
      "[data-line]": {
        "--line-decoration": "none",
      },
    },
    "@media (forced-colors: active)": {
      "[data-line]": {
        "--line-color": "CanvasText",
        "--line-ink": "Canvas",
        "--line-border": "1px solid CanvasText",
      },
    },
    '[data-tfl-colour="mono"] [data-line]': {
      "--line-color": "var(--foreground)",
      "--line-ink": "var(--background)",
    },
    ...(diagramBindingSelector
      ? {
          [diagramBindingSelector]: {
            "--line-raw": "var(--tfl-diagram-cable-car)",
          },
        }
      : {}),
    '[data-tfl-northern="halo"] [data-line="northern"], [data-line="northern"][data-tfl-northern="halo"]':
      {
        "--line-raw": BLACK_OKLCH,
        "--line-ink": WHITE_OKLCH,
      },
  }

  const cssText = renderCssFile(tokens, light, dark, theme)

  return { cssText, cssVars: { theme, light, dark }, css }
}

const renderCssFile = (
  tokens: ColourToken[],
  light: Record<string, string>,
  dark: Record<string, string>,
  theme: Record<string, string>
): string => {
  const lines: string[] = [
    "/*",
    " * GENERATED FILE — do not edit by hand.",
    " * Source: lib/tfl/brand-colours.ts via scripts/build-colour-tokens.ts",
    " * Dark palette = brand + Go night OKLCH method (lib/tfl/dark-line-colours.ts).",
    ` * Northern dark default = ${NORTHERN_DARK_HEX} (Go light fill); halo opt-in keeps black.`,
    " */",
    "",
    ":root {",
  ]

  for (const [key, value] of Object.entries(light)) {
    lines.push(`  --${key}: ${value};`)
  }

  lines.push(
    "}",
    "",
    "/* Dark map — brand + Go night OKLCH method; Northern light fill. */",
    ".dark {"
  )
  for (const [key, value] of Object.entries(dark)) {
    lines.push(`  --${key}: ${value};`)
  }

  // `static` keeps every --color-tfl-* utility var in production CSS even when
  // consumers only bind via data-line (dynamic attrs are invisible to scanning).
  lines.push("}", "", "@theme static {")
  for (const [key, value] of Object.entries(theme)) {
    lines.push(`  --${key}: ${value};`)
  }
  lines.push("}", "")

  const utilityPins = tokens
    .flatMap((token) => [`bg-${token.varName}`, `text-${token.varName}`])
    .join(" ")
  lines.push(
    "/* Pin utilities so class scanners keep them when demos use data-line only. */"
  )
  lines.push(`@source inline("${utilityPins}");`)
  lines.push("")

  lines.push("@layer base {")
  lines.push("  [data-line] {")
  lines.push("    --line-color: var(--line-raw);")
  lines.push(`    --line-ink: ${WHITE_OKLCH};`)
  lines.push("    --line-stroke-style: solid;")
  lines.push("  }")
  for (const token of tokens) {
    for (const id of token.dataLineIds) {
      const strokeStyle = resolveRouteTrackStyle(id)
      lines.push(`  [data-line='${id}'] {`)
      lines.push(`    --line-raw: var(--${token.varName});`)
      if (token.inkOklch !== WHITE_OKLCH) {
        lines.push(`    --line-ink: ${token.inkOklch};`)
      }
      if (strokeStyle !== "solid") {
        lines.push(`    --line-stroke-style: ${strokeStyle};`)
      }
      lines.push("  }")
    }
  }
  lines.push("}", "")

  const diagramIds = tokens.flatMap((token) =>
    token.dataLineIds.filter((id) => resolveRouteTrackStyle(id) === "cable-car")
  )
  if (diagramIds.length > 0) {
    lines.push("/* Cable Car diagram paint: map red, not mode purple. */")
    lines.push(
      `${diagramIds
        .map((id) => `[data-line='${id}'][data-tfl-diagram]`)
        .join(",\n")} {`
    )
    lines.push("  --line-raw: var(--tfl-diagram-cable-car);")
    lines.push("}", "")
  }

  lines.push(".dark [data-line='northern'] {")
  lines.push(`  --line-ink: ${BLACK_OKLCH};`)
  lines.push("}", "")

  lines.push(
    "@media (prefers-contrast: more) and (not (forced-colors: active)) {"
  )
  lines.push("  [data-line] {")
  lines.push(
    "    --line-color: oklch(from var(--line-raw) calc(l * 0.82) c h);"
  )
  lines.push("  }")
  lines.push("}", "")

  lines.push("@media (prefers-contrast) {")
  lines.push("  [data-line] {")
  lines.push("    --line-decoration: none;")
  lines.push("  }")
  lines.push("}", "")

  lines.push("@media (forced-colors: active) {")
  lines.push("  [data-line] {")
  lines.push("    --line-color: CanvasText;")
  lines.push("    --line-ink: Canvas;")
  lines.push("    --line-border: 1px solid CanvasText;")
  lines.push("  }")
  lines.push("}", "")

  lines.push('[data-tfl-colour="mono"] [data-line] {')
  lines.push("  --line-color: var(--foreground);")
  lines.push("  --line-ink: var(--background);")
  lines.push("}", "")

  lines.push(
    "/* Opt-in: brand-black Northern + light halo (stroke / text-shadow). */"
  )
  lines.push('[data-tfl-northern="halo"] [data-line="northern"],')
  lines.push('[data-line="northern"][data-tfl-northern="halo"] {')
  lines.push("  --line-raw: oklch(0% 0 0);")
  lines.push(`  --line-ink: ${WHITE_OKLCH};`)
  lines.push("}", "")
  lines.push(".tfl-northern-halo-stroke {")
  lines.push(
    `  text-shadow: -1px -1px 0 ${NORTHERN_DARK_HEX}, 1px -1px 0 ${NORTHERN_DARK_HEX}, -1px 1px 0 ${NORTHERN_DARK_HEX}, 1px 1px 0 ${NORTHERN_DARK_HEX};`
  )
  lines.push("}", "")
  lines.push(".tfl-northern-halo-bar {")
  lines.push(`  box-shadow: 0 0 0 1px ${NORTHERN_DARK_HEX};`)
  lines.push("}", "")

  return `${lines.join("\n")}\n`
}

const COLOUR_CONSUMERS = [
  "line-badge",
  "tube-status-board",
  "arrivals-board",
  "rail-arrivals-board",
  "bus-arrivals-board",
  "river-bus-arrivals-board",
  "live-arrivals-board",
  "line-strip",
] as const

/**
 * Bare names resolve to ui.shadcn.com. Our own items must be absolute URLs
 * so `shadcn add https://tfl.manglekuo.com/r/….json` pulls the full graph
 * without requiring a `@tfl` namespace in the consumer's components.json.
 */
const absoluteOwnRegistryDep = (
  dep: string,
  ownNames: ReadonlySet<string>
): string => {
  if (
    dep.startsWith("http://") ||
    dep.startsWith("https://") ||
    dep.startsWith("@") ||
    dep.includes("/")
  ) {
    return dep
  }
  if (!ownNames.has(dep)) return dep
  return `${REGISTRY_BASE}/${dep}.json`
}

const normalizeOwnRegistryDependencies = (registry: {
  items: Array<Record<string, unknown>>
}): void => {
  const ownNames = new Set(
    registry.items
      .map((entry) => entry.name)
      .filter((name): name is string => typeof name === "string")
  )

  for (const entry of registry.items) {
    const deps = entry.registryDependencies
    if (!Array.isArray(deps)) continue
    entry.registryDependencies = deps.map((dep) =>
      typeof dep === "string" ? absoluteOwnRegistryDep(dep, ownNames) : dep
    )
  }
}

const upsertRegistryItem = (artefacts: ColourTokensArtefacts): void => {
  const raw = readFileSync(COLOUR_TOKENS_REGISTRY_PATH, "utf8")
  const registry = JSON.parse(raw) as {
    items: Array<Record<string, unknown>>
  }

  const item = {
    name: "tfl-colours",
    type: "registry:theme",
    title: "TfL colours",
    description:
      "Installable TfL line/mode OKLCH colour tokens with data-line role bindings, a11y adaptations, and an importable line→colour map for static Tailwind classes.",
    dependencies: ["tfl-ts@^2.11.0"],
    cssVars: artefacts.cssVars,
    css: artefacts.css,
    files: [
      {
        path: "lib/tfl/brand-colours.ts",
        type: "registry:lib",
        target: "lib/tfl/brand-colours.ts",
      },
      {
        path: "lib/tfl/line-colour-map.ts",
        type: "registry:lib",
        target: "lib/tfl/line-colour-map.ts",
      },
      {
        path: "lib/tfl/route-track.ts",
        type: "registry:lib",
        target: "lib/tfl/route-track.ts",
      },
      {
        path: "lib/tfl/line-diagram.ts",
        type: "registry:lib",
        target: "lib/tfl/line-diagram.ts",
      },
      {
        path: "lib/tfl/bw-line-styles.ts",
        type: "registry:lib",
        target: "lib/tfl/bw-line-styles.ts",
      },
      {
        path: "lib/tfl/river-bus.ts",
        type: "registry:lib",
        target: "lib/tfl/river-bus.ts",
      },
    ],
  }

  const index = registry.items.findIndex(
    (entry) => entry.name === "tfl-colours"
  )
  if (index >= 0) {
    registry.items[index] = item
  } else {
    const lineBadgeIndex = registry.items.findIndex(
      (entry) => entry.name === "line-badge"
    )
    if (lineBadgeIndex >= 0) {
      registry.items.splice(lineBadgeIndex, 0, item)
    } else {
      registry.items.unshift(item)
    }
  }

  for (const name of COLOUR_CONSUMERS) {
    const entry = registry.items.find((itemEntry) => itemEntry.name === name)
    if (!entry) continue
    const deps = Array.isArray(entry.registryDependencies)
      ? [...(entry.registryDependencies as string[])]
      : []
    if (!deps.includes(COLOURS_REGISTRY_URL)) {
      deps.unshift(COLOURS_REGISTRY_URL)
    }
    entry.registryDependencies = deps
  }

  normalizeOwnRegistryDependencies(registry)

  writeFileSync(
    COLOUR_TOKENS_REGISTRY_PATH,
    `${JSON.stringify(registry, null, 2)}\n`,
    "utf8"
  )
}

export const writeColourTokens = (): ColourTokensArtefacts => {
  const artefacts = buildColourTokensArtefacts()
  writeFileSync(COLOUR_TOKENS_CSS_PATH, artefacts.cssText, "utf8")
  upsertRegistryItem(artefacts)
  return artefacts
}

/** Pure check used by tests — regenerating must match committed CSS. */
export const colourTokensCssIsCurrent = (): boolean => {
  const expected = buildColourTokensArtefacts().cssText
  let actual = ""
  try {
    actual = readFileSync(COLOUR_TOKENS_CSS_PATH, "utf8")
  } catch {
    return false
  }
  return actual === expected
}

const isMain =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]

if (isMain) {
  writeColourTokens()
  console.log(`Wrote ${COLOUR_TOKENS_CSS_PATH}`)
  console.log(`Updated tfl-colours in ${COLOUR_TOKENS_REGISTRY_PATH}`)
}
