/**
 * Shared river-pier normalisation — used by Explorer loaders and finders.
 * Plain module (not `"use cache"`).
 */

import {
  FERRY_PORT_STOP_TYPE,
  filterRiverBusLineIds,
  isFerryPortId,
} from "@/lib/tfl/river-bus"

export type MappedFerryPort = {
  id: string
  name: string
  lat?: number
  lon?: number
  lines: string[]
}

export const isFerryPortStop = (stop: {
  id?: string
  naptanId?: string
  stopType?: string
}): boolean => {
  const id = (stop.id ?? stop.naptanId ?? "").trim()
  if (!id) return false
  if (stop.stopType === FERRY_PORT_STOP_TYPE) return true
  return isFerryPortId(id)
}

type LineRef = { id?: string; name?: string } | string

export const mapFerryPort = (stop: {
  id?: string
  naptanId?: string
  commonName?: string
  name?: string
  lat?: number
  lon?: number
  stopType?: string
  lines?: LineRef[]
}): MappedFerryPort | null => {
  const id = (stop.id ?? stop.naptanId ?? "").trim()
  if (!id || !isFerryPortStop(stop)) return null
  const name = (stop.commonName ?? stop.name ?? id).trim() || id
  const rawLineIds = (stop.lines ?? []).map((line) =>
    typeof line === "string" ? line : (line.id ?? line.name ?? ""),
  )
  return {
    id,
    name,
    lat: typeof stop.lat === "number" ? stop.lat : undefined,
    lon: typeof stop.lon === "number" ? stop.lon : undefined,
    lines: filterRiverBusLineIds(rawLineIds),
  }
}
