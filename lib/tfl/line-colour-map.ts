/**
 * Line / mode id → colour token metadata for app code.
 *
 * Tailwind only emits utilities it can see as **complete** class strings at
 * build time. Never interpolate:
 *
 *   `bg-tfl-line-${line.id}`  // ❌ not scanned — no CSS
 *
 * Prefer either:
 *   1. `data-line={id}` + `bg-[var(--line-color)]` (dynamic ids OK), or
 *   2. look up `bgClass` / `textClass` from this map (predefined strings).
 *
 * Tokens themselves ship via `tfl-colours` (CSS). This map is the coding-side
 * companion for iteration and static class selection.
 */

import {
  OVERGROUND_LINE_COLOURS,
  TFL_MODAL_COLOURS,
  UNDERGROUND_LINE_COLOURS,
  type BrandColourSpec,
} from "@/lib/tfl/brand-colours"
import { RIVER_BUS_LINE_IDS } from "@/lib/tfl/river-bus"
import { resolveRouteTrackStyle } from "@/lib/tfl/route-track"

export type LineColourKind = "line" | "mode"

export type LineColourToken = {
  /** Primary `data-line` id (e.g. `northern`, `elizabeth`). */
  id: string
  /** Extra API / docs aliases that bind to the same token. */
  aliases: readonly string[]
  name: string
  kind: LineColourKind
  /** CSS custom property without `--` (e.g. `tfl-line-northern`). */
  cssVar: string
  /** Complete Tailwind class strings — use as-is, never build with template literals. */
  bgClass: string
  textClass: string
  hex: string
  spec: BrandColourSpec
}

/** Extra aliases so API / docs ids resolve without per-call maps. */
const DATA_LINE_ALIASES: Record<string, readonly string[]> = {
  elizabeth: ["elizabeth-line"],
  trams: ["tram"],
  "cable-car": ["london-cable-car"],
  river: [...RIVER_BUS_LINE_IDS, "river-bus"],
}

const toDataLineId = (key: string): string =>
  key
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .toLowerCase()

const buildToken = (
  kind: LineColourKind,
  key: string,
  spec: BrandColourSpec
): LineColourToken => {
  const id = toDataLineId(key)
  const cssVar = `tfl-${kind}-${id}`
  return {
    id,
    aliases: DATA_LINE_ALIASES[id] ?? [],
    name: spec.label,
    kind,
    cssVar,
    bgClass: `bg-tfl-${kind}-${id}`,
    textClass: `text-tfl-${kind}-${id}`,
    hex: spec.hex,
    spec,
  }
}

/** Canonical list — one entry per published token (not per alias). */
export const LINE_COLOUR_TOKENS: readonly LineColourToken[] = [
  ...Object.entries(UNDERGROUND_LINE_COLOURS).map(([key, spec]) =>
    buildToken("line", key, spec)
  ),
  ...Object.entries(OVERGROUND_LINE_COLOURS).map(([key, spec]) =>
    buildToken("line", key, spec)
  ),
  ...Object.entries(TFL_MODAL_COLOURS).map(([key, spec]) =>
    buildToken("mode", key, spec)
  ),
]

const BY_ID: Map<string, LineColourToken> = (() => {
  const map = new Map<string, LineColourToken>()
  for (const token of LINE_COLOUR_TOKENS) {
    map.set(token.id, token)
    for (const alias of token.aliases) {
      map.set(alias, token)
    }
  }
  return map
})()

/** Resolve a TfL line / mode id (or alias) to its colour token. */
export const getLineColourToken = (
  lineId: string
): LineColourToken | undefined => BY_ID.get(lineId.toLowerCase())

/**
 * Predefined `bg-tfl-*` class for a line id, or `undefined` if unknown.
 * Safe to pass into `className` — never interpolate the id into a template.
 */
export const getLineColourBgClass = (lineId: string): string | undefined =>
  getLineColourToken(lineId)?.bgClass

/**
 * Predefined `text-tfl-*` class for a line id, or `undefined` if unknown.
 */
export const getLineColourTextClass = (lineId: string): string | undefined =>
  getLineColourToken(lineId)?.textClass

/**
 * Mode name for `LineColorBar` rail stacks (Overground / Elizabeth / Cable Car).
 * Not every token needs a special mode — plain tube lines omit this.
 *
 * @deprecated Prefer `resolveRouteTrackStyle` from `@/lib/tfl/route-track`.
 */
export const getLineColourBarMode = (lineId: string): string | undefined => {
  const style = resolveRouteTrackStyle(lineId)
  if (style === "solid") return undefined
  if (style === "cable-car") return "cable-car"
  const token = getLineColourToken(lineId)
  if (token?.id === "elizabeth" || token?.aliases.includes("elizabeth-line")) {
    return "elizabeth-line"
  }
  return "overground"
}
