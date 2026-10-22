/**
 * Which Customise panel a visitor sees: the current panel, or variant C
 * (board as layers), D (task tabs) or R (recommended full page).
 * Pure: no React / browser APIs. The A/B split is OFF: everyone gets the
 * current panel unless `?customise=c|d|r` asks for a variant.
 */

export const CUSTOMISE_VARIANTS = ["panel", "c", "d", "r"] as const
export type CustomiseVariant = (typeof CUSTOMISE_VARIANTS)[number]

/** `?customise=c|d|r` picks a variant and keeps it; `?customise=panel` goes back. */
export const CUSTOMISE_PARAM = "customise"
export const CUSTOMISE_STORAGE_KEY = "tfl-board-customise.v1"

export type CustomiseSplit = {
  /** Change to reshuffle every visitor. */
  version: string
  /** Relative weights; zero or missing never assigned. */
  weights: Partial<Record<CustomiseVariant, number>>
}

/** OFF. Set e.g. `{ version: "v1", weights: { panel: 1, r: 1 } }` to start a test. */
export const CUSTOMISE_SPLIT: CustomiseSplit | null = null

export type CustomiseSource = "param" | "override" | "assigned" | "default"

export type CustomiseStored = {
  /** Chosen with `?customise=` (QA, Mangle's phone). Never counted. */
  override?: CustomiseVariant
  /** Sticky assignment from a split, by split version. */
  assigned?: { variant: CustomiseVariant; split: string }
}

export const isCustomiseVariant = (value: unknown): value is CustomiseVariant =>
  (CUSTOMISE_VARIANTS as readonly unknown[]).includes(value)

/** c|d|r pick a variant; panel / default / off clear the choice. */
export const parseCustomiseParam = (
  raw: string | null | undefined
): CustomiseVariant | "clear" | null => {
  const value = raw?.trim().toLowerCase() ?? ""
  if (!value) return null
  if (value === "panel" || value === "default" || value === "off")
    return "clear"
  return isCustomiseVariant(value) ? value : null
}

export const parseCustomiseStored = (raw: unknown): CustomiseStored => {
  if (typeof raw !== "object" || raw === null) return {}
  const record = raw as Record<string, unknown>
  const stored: CustomiseStored = {}
  if (isCustomiseVariant(record.override)) stored.override = record.override
  const assigned = record.assigned as Record<string, unknown> | undefined
  if (
    assigned &&
    isCustomiseVariant(assigned.variant) &&
    typeof assigned.split === "string"
  ) {
    stored.assigned = { variant: assigned.variant, split: assigned.split }
  }
  return stored
}

/** Weighted pick from a roll in [0, 1). */
export const variantFromSplit = (
  split: CustomiseSplit,
  roll: number
): CustomiseVariant => {
  const entries = CUSTOMISE_VARIANTS.map(
    (variant) => [variant, Math.max(0, split.weights[variant] ?? 0)] as const
  ).filter(([, weight]) => weight > 0)
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0)
  if (total === 0) return "panel"
  let left = Math.min(Math.max(roll, 0), 0.999999) * total
  for (const [variant, weight] of entries) {
    if (left < weight) return variant
    left -= weight
  }
  return entries.at(-1)?.[0] ?? "panel"
}

export type CustomiseResolution = {
  variant: CustomiseVariant
  source: CustomiseSource
  /** What to write back to storage (unchanged when equal to the input). */
  stored: CustomiseStored
}

/**
 * URL param first (and remembered), then a remembered param, then a sticky
 * split assignment, then the current panel.
 */
export const resolveCustomiseVariant = ({
  param,
  stored,
  split = CUSTOMISE_SPLIT,
  roll,
}: {
  param: string | null | undefined
  stored: CustomiseStored
  split?: CustomiseSplit | null
  roll: () => number
}): CustomiseResolution => {
  const asked = parseCustomiseParam(param)
  let next: CustomiseStored = { ...stored }
  if (asked === "clear") delete next.override
  if (asked && asked !== "clear") {
    next.override = asked
    return { variant: asked, source: "param", stored: next }
  }
  if (next.override) {
    return { variant: next.override, source: "override", stored: next }
  }
  if (split) {
    if (next.assigned?.split === split.version) {
      return {
        variant: next.assigned.variant,
        source: "assigned",
        stored: next,
      }
    }
    const variant = variantFromSplit(split, roll())
    next = { ...next, assigned: { variant, split: split.version } }
    return { variant, source: "assigned", stored: next }
  }
  return { variant: "panel", source: "default", stored: next }
}
