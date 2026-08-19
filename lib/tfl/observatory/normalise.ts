import { isObservedMode } from "@/lib/tfl/observatory/inventory"
import type {
  CanonicalLine,
  CanonicalLineStops,
  CanonicalPayload,
  CanonicalRouteBranch,
  CanonicalRouteSequence,
  CanonicalStop,
  ObservatoryDirection,
  RawLine,
  RawOrderedRoute,
  RawRouteSequence,
  RawStopPoint,
  RawStopPointSequence,
} from "@/lib/tfl/observatory/types"

const compareId = (a: string, b: string): number => a.localeCompare(b, "en")

const cleanText = (value: string | null | undefined): string =>
  (value ?? "").replace(/\s+/g, " ").trim()

export const stopPointId = (stop: RawStopPoint): string =>
  cleanText(stop.id) || cleanText(stop.naptanId)

export const stopPointName = (stop: RawStopPoint, fallbackId: string): string =>
  cleanText(stop.commonName) || cleanText(stop.name) || fallbackId

export type NormaliseLinesResult = {
  lines: CanonicalLine[]
  rawCount: number
  dropped: number
}

export const normaliseLines = (
  raw: readonly RawLine[] | null | undefined
): NormaliseLinesResult => {
  const source = raw ?? []
  const byId = new Map<string, CanonicalLine>()
  let dropped = 0

  for (const line of source) {
    const id = cleanText(line.id).toLowerCase()
    const modeName = cleanText(line.modeName).toLowerCase()
    if (!id || !isObservedMode(modeName)) {
      dropped += 1
      continue
    }
    const serviceTypes = [
      ...new Set(
        (line.serviceTypes ?? [])
          .map((entry) => cleanText(entry?.name))
          .filter(Boolean)
      ),
    ].sort(compareId)
    const next: CanonicalLine = {
      id,
      name: cleanText(line.name) || id,
      modeName,
      serviceTypes,
    }
    const existing = byId.get(id)
    if (!existing || next.name.localeCompare(existing.name, "en") < 0) {
      byId.set(id, next)
    }
  }

  return {
    lines: [...byId.values()].sort((a, b) => compareId(a.id, b.id)),
    rawCount: source.length,
    dropped,
  }
}

export type NormaliseStopsResult = {
  stops: CanonicalStop[]
  rawCount: number
  dropped: number
}

export const normaliseStops = (
  lineId: string,
  raw: readonly RawStopPoint[] | null | undefined
): NormaliseStopsResult => {
  const source = raw ?? []
  const byId = new Map<string, CanonicalStop>()
  let dropped = 0

  for (const stop of source) {
    const id = stopPointId(stop)
    if (!id) {
      dropped += 1
      continue
    }
    const next: CanonicalStop = {
      id,
      name: stopPointName(stop, id),
    }
    const existing = byId.get(id)
    if (!existing || next.name.localeCompare(existing.name, "en") < 0) {
      byId.set(id, next)
    }
  }

  return {
    stops: [...byId.values()].sort((a, b) => compareId(a.id, b.id)),
    rawCount: source.length,
    dropped,
  }
}

const cleanNaptanIds = (
  ids: readonly (string | null | undefined)[] | null | undefined
): string[] => {
  const seen = new Set<string>()
  const next: string[] = []
  for (const id of ids ?? []) {
    const cleaned = cleanText(id)
    if (!cleaned || seen.has(cleaned)) continue
    seen.add(cleaned)
    next.push(cleaned)
  }
  return next
}

const branchFromOrderedRoute = (
  route: RawOrderedRoute
): CanonicalRouteBranch | null => {
  const naptanIds = cleanNaptanIds(route.naptanIds)
  if (naptanIds.length === 0) return null
  return {
    name: cleanText(route.name),
    serviceType: cleanText(route.serviceType),
    naptanIds,
  }
}

const branchFromStopSequence = (
  sequence: RawStopPointSequence
): CanonicalRouteBranch | null => {
  const naptanIds = cleanNaptanIds(
    (sequence.stopPoint ?? []).map((stop) => stopPointId(stop))
  )
  if (naptanIds.length === 0) return null
  return { name: "", serviceType: "", naptanIds }
}

const compareBranches = (
  a: CanonicalRouteBranch,
  b: CanonicalRouteBranch
): number => {
  const name = a.name.localeCompare(b.name, "en")
  if (name !== 0) return name
  const service = a.serviceType.localeCompare(b.serviceType, "en")
  if (service !== 0) return service
  return a.naptanIds.join("\0").localeCompare(b.naptanIds.join("\0"), "en")
}

export type NormaliseRouteResult = {
  route: CanonicalRouteSequence
  rawBranchCount: number
  dropped: number
}

export const normaliseRouteSequence = (
  lineId: string,
  direction: ObservatoryDirection,
  raw: RawRouteSequence | null | undefined
): NormaliseRouteResult => {
  const ordered = raw?.orderedLineRoutes ?? []
  const sequences = raw?.stopPointSequences ?? []
  const fromOrdered = ordered
    .map(branchFromOrderedRoute)
    .filter((branch): branch is CanonicalRouteBranch => branch !== null)
  const branches =
    fromOrdered.length > 0
      ? fromOrdered
      : sequences
          .map(branchFromStopSequence)
          .filter((branch): branch is CanonicalRouteBranch => branch !== null)

  const unique = new Map<string, CanonicalRouteBranch>()
  for (const branch of branches) {
    unique.set(
      `${branch.name}\0${branch.serviceType}\0${branch.naptanIds.join(",")}`,
      branch
    )
  }

  const rawBranchCount = ordered.length > 0 ? ordered.length : sequences.length
  return {
    route: {
      lineId,
      direction,
      branches: [...unique.values()].sort(compareBranches),
    },
    rawBranchCount,
    dropped: Math.max(0, rawBranchCount - unique.size),
  }
}

export const cataloguePayload = (lines: CanonicalLine[]): CanonicalPayload => ({
  kind: "line-catalogue",
  lines,
})

export const stopsPayload = (
  lineId: string,
  stops: CanonicalStop[]
): CanonicalPayload => ({
  kind: "stop-points",
  lineId,
  stops,
})

export const routePayload = (
  route: CanonicalRouteSequence
): CanonicalPayload => ({
  kind: "route-sequence",
  lineId: route.lineId,
  direction: route.direction,
  branches: route.branches,
})

export const asLineStops = (
  lineId: string,
  stops: CanonicalStop[]
): CanonicalLineStops => ({ lineId, stops })
