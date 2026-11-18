/**
 * How Customise lists reorder. `?reorder=a` lifts a held row that follows the
 * finger; `?reorder=b` adds a Reorder / Done button with grips. Anything else
 * keeps the current long-press and drop line. Not remembered.
 */

export const REORDER_PARAM = "reorder"

export type ReorderVariant = "default" | "a" | "b"

export const parseReorderParam = (
  raw: string | null | undefined
): ReorderVariant => {
  const value = raw?.trim().toLowerCase()
  return value === "a" || value === "b" ? value : "default"
}
