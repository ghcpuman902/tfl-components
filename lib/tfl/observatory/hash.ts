import { createHash } from "node:crypto"
import type { CanonicalPayload } from "@/lib/tfl/observatory/types"

const sortKeys = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(sortKeys)
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>
    const next: Record<string, unknown> = {}
    for (const key of Object.keys(record).sort((a, b) => a.localeCompare(b))) {
      next[key] = sortKeys(record[key])
    }
    return next
  }
  return value
}

export const stableStringify = (value: unknown): string =>
  JSON.stringify(sortKeys(value))

export const hashCanonical = (payload: CanonicalPayload): string =>
  createHash("sha256").update(stableStringify(payload)).digest("hex")

export const itemCount = (payload: CanonicalPayload): number => {
  if (payload.kind === "line-catalogue") return payload.lines.length
  if (payload.kind === "stop-points") return payload.stops.length
  return payload.branches.reduce(
    (sum, branch) => sum + branch.naptanIds.length,
    0
  )
}
