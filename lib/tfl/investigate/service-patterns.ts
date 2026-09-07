/**
 * Distinct stopping-pattern catalogue, derived from TfL's own named
 * `orderedLineRoutes` entries (via `LINE_STATION_SEQUENCES`) rather than a
 * hand-authored taxonomy. Each direction of the same route is collapsed to
 * one representative; the longest representative becomes the reference
 * ("dominant") pattern that the others are compared against.
 *
 * Skip-stop detection is generic: it looks for a shared span between two
 * patterns where one visits a strict, order-preserving subset of the
 * other's stations — the Elizabeth line's Liverpool Street–Shenfield route
 * (which bypasses Whitechapel) falls out of this automatically, it is not
 * special-cased.
 */

import { getHubMembership, getRawSequence, type RawOrderedRoute } from "./raw-data"
import type { PatternRelation, ServicePatternReport, StationRef } from "./types"

/**
 * TfL's own Route/Sequence data can name the same physical place with two
 * different StopPoint ids depending on which route variant it belongs to
 * (e.g. Elizabeth line "Liverpool Street" `910GLIVSTLL` on the Whitechapel
 * approach vs "London Liverpool Street" `910GLIVST` on the direct approach
 * from the east — both members of TfL hub `HUBLST`). Pattern comparison
 * uses this hub id as a canonical key so two patterns that share a physical
 * point are recognised as sharing it, even when the raw ids differ; display
 * still uses each pattern's own raw id/name.
 */
const canonicalKey = (id: string): string => getHubMembership(id)?.hubId ?? id

type RepresentativePattern = {
  key: string
  direction: "inbound" | "outbound"
  name: string
  stationIds: string[]
  bothDirectionsObserved: boolean
}

const reversed = <T>(items: readonly T[]): T[] => [...items].reverse()

const groupIntoRepresentatives = (routes: readonly RawOrderedRoute[]): RepresentativePattern[] => {
  const bySet = new Map<string, RawOrderedRoute[]>()
  for (const route of routes) {
    const key = [...route.stationIds].sort().join(",")
    if (!bySet.has(key)) bySet.set(key, [])
    bySet.get(key)!.push(route)
  }

  const representatives: RepresentativePattern[] = []
  for (const [key, group] of bySet) {
    const inbound = group.find((route) => route.direction === "inbound")
    const outbound = group.find((route) => route.direction === "outbound")
    const chosen = inbound ?? outbound!
    const other = inbound ? outbound : undefined
    const bothDirectionsObserved =
      !!other &&
      other.stationIds.length === chosen.stationIds.length &&
      reversed(other.stationIds).every((id, index) => id === chosen.stationIds[index])
    representatives.push({
      key,
      direction: chosen.direction,
      name: chosen.name.replace(/\s+/g, " ").trim(),
      stationIds: chosen.stationIds,
      bothDirectionsObserved,
    })
  }
  return representatives
}

/** Is `sub` an order-preserving subsequence of `sup` (gaps allowed)? */
const isOrderedSubsequence = (sub: readonly string[], sup: readonly string[]): boolean => {
  let cursor = 0
  for (const id of sub) {
    const found = sup.indexOf(id, cursor)
    if (found === -1) return false
    cursor = found + 1
  }
  return true
}

/** Slice `items` to the range between the first index where `keys` matches `fromKey`/`toKey` (direction-aware, parallel arrays). */
const sliceByKeyRange = <T>(
  items: readonly T[],
  keys: readonly string[],
  fromKey: string,
  toKey: string
): T[] => {
  const a = keys.indexOf(fromKey)
  const b = keys.indexOf(toKey)
  if (a === -1 || b === -1) return []
  return a <= b ? items.slice(a, b + 1) : reversed(items.slice(b, a + 1))
}

const classifyRelation = (
  candidate: RepresentativePattern,
  dominant: RepresentativePattern,
  nameOf: Map<string, string>
): { relation: PatternRelation; skips: StationRef[]; note: string } => {
  const dominantKeys = dominant.stationIds.map(canonicalKey)
  const candidateKeys = candidate.stationIds.map(canonicalKey)
  const dominantKeySet = new Set(dominantKeys)
  const sharedKeys = candidateKeys.filter((key) => dominantKeySet.has(key))

  if (sharedKeys.length < 2) {
    return {
      relation: "unrelated",
      skips: [],
      note: "Shares fewer than two stations with the dominant pattern — a distinct corridor, not a variant of it.",
    }
  }

  const start = sharedKeys[0]!
  const end = sharedKeys[sharedKeys.length - 1]!
  const candidateSpanKeys = sliceByKeyRange(candidateKeys, candidateKeys, start, end)
  const dominantSpanKeys = sliceByKeyRange(dominantKeys, dominantKeys, start, end)
  const dominantSpanIds = sliceByKeyRange(dominant.stationIds, dominantKeys, start, end)
  const startName = nameOf.get(sliceByKeyRange(candidate.stationIds, candidateKeys, start, end)[0]!) ?? start
  const endName =
    nameOf.get(sliceByKeyRange(candidate.stationIds, candidateKeys, start, end).at(-1)!) ?? end
  const sameSpan =
    candidateSpanKeys.length === dominantSpanKeys.length &&
    candidateSpanKeys.every((key, index) => key === dominantSpanKeys[index])

  if (sameSpan) {
    const extendsBeyond = candidateKeys.some((key) => !dominantKeySet.has(key))
    if (!extendsBeyond) {
      return {
        relation: "shared-corridor-subset",
        skips: [],
        note: `A shorter run of the dominant pattern, from ${nameOf.get(candidate.stationIds[0]!)} to ${nameOf.get(candidate.stationIds[candidate.stationIds.length - 1]!)}.`,
      }
    }
    return {
      relation: "different-terminus",
      skips: [],
      note: "Follows the dominant pattern across the shared span, but reaches a different terminus.",
    }
  }

  if (isOrderedSubsequence(candidateSpanKeys, dominantSpanKeys)) {
    const skippedIds = dominantSpanIds.filter(
      (id, index) => !candidateSpanKeys.includes(dominantSpanKeys[index]!)
    )
    return {
      relation: "skip-variant",
      skips: skippedIds.map((id) => ({ id, name: nameOf.get(id) ?? id })),
      note: `Between ${startName} and ${endName}, bypasses ${skippedIds
        .map((id) => nameOf.get(id) ?? id)
        .join(", ")} that the dominant pattern calls at.`,
    }
  }

  return {
    relation: "different-terminus",
    skips: [],
    note: `Diverges from the dominant pattern between ${startName} and ${endName} via different stations, then rejoins.`,
  }
}

export const derivePatterns = (lineId: string): ServicePatternReport[] => {
  const raw = getRawSequence(lineId)
  if (!raw) return []
  const nameOf = new Map(raw.stations.map((station) => [station.id, station.name]))
  const label = (ids: readonly string[]): string =>
    `${nameOf.get(ids[0]!) ?? ids[0]} \u2194 ${nameOf.get(ids[ids.length - 1]!) ?? ids[ids.length - 1]}`

  const representatives = groupIntoRepresentatives(raw.orderedRoutes)
  if (representatives.length === 0) return []

  const dominant = [...representatives].sort(
    (a, b) => b.stationIds.length - a.stationIds.length
  )[0]!

  return representatives
    .sort((a, b) => b.stationIds.length - a.stationIds.length)
    .map((pattern) => {
      const isDominant = pattern.key === dominant.key
      const { relation, skips, note } = isDominant
        ? {
            relation: "dominant" as const,
            skips: [] as StationRef[],
            note: "Longest observed route on this line — used here as the reference pattern.",
          }
        : classifyRelation(pattern, dominant, nameOf)

      return {
        key: pattern.key,
        label: label(pattern.stationIds),
        direction: pattern.direction,
        stationSequence: pattern.stationIds.map((id) => ({ id, name: nameOf.get(id) ?? id })),
        isDominant,
        relation,
        skips,
        note: pattern.bothDirectionsObserved
          ? note
          : `${note} (only observed in the ${pattern.direction} direction)`,
      }
    })
}
