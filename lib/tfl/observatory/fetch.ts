import { getTflClient } from "@/lib/tfl/client"
import {
  type CensusId,
  VERIFIED_CENSUS_COUNTS,
} from "@/lib/tfl/observatory/census"
import { OBSERVED_MODES } from "@/lib/tfl/observatory/inventory"
import type {
  ObservatoryDirection,
  RawLine,
  RawRouteSequence,
  RawStopPoint,
} from "@/lib/tfl/observatory/types"

export type MetadataFetcher = {
  getLinesByModes: (modes: readonly string[]) => Promise<RawLine[]>
  getStopPoints: (lineId: string) => Promise<RawStopPoint[]>
  getRouteSequence: (
    lineId: string,
    direction: ObservatoryDirection
  ) => Promise<RawRouteSequence>
  getCensusCount: (id: CensusId) => Promise<number>
}

const asRawLines = (value: unknown): RawLine[] =>
  Array.isArray(value) ? (value as RawLine[]) : []

const asRawStops = (value: unknown): RawStopPoint[] =>
  Array.isArray(value) ? (value as RawStopPoint[]) : []

/**
 * Live Unified API reads through the site tfl-ts client.
 * Rail catalogues keep an observed baseline. Count checks compare
 * to yesterday's last good total.
 */
export const createTflMetadataFetcher = (): MetadataFetcher => {
  const client = getTflClient()
  return {
    getLinesByModes: async (modes) => {
      const requested = modes.length > 0 ? modes : OBSERVED_MODES
      const lines = await client.line.get({
        modes: [...requested],
      })
      return asRawLines(lines)
    },
    getStopPoints: async (lineId) => {
      const stops = await client.line.getStopPoints(lineId)
      return asRawStops(stops)
    },
    getRouteSequence: async (lineId, direction) => {
      const sequence = await client.line.getRouteSequence({
        id: lineId,
        direction,
        excludeCrowding: true,
      })
      return sequence as RawRouteSequence
    },
    getCensusCount: async (id) => {
      if (id === "bus-lines") {
        return asRawLines(await client.line.get({ modes: ["bus"] })).length
      }
      if (id === "bike-points") {
        const points = await client.bikePoint.get()
        return Array.isArray(points) ? points.length : 0
      }
      const result = await client.stopPoint.getByMode({
        modes: ["bus"],
        page: 1,
      })
      return result.total ?? result.stopPoints?.length ?? 0
    },
  }
}

export const createStaticMetadataFetcher = (input: {
  lines?: RawLine[]
  stops?: Record<string, RawStopPoint[]>
  routes?: Record<string, RawRouteSequence>
  census?: Partial<Record<CensusId, number>>
  failures?: {
    lines?: Error
    stops?: Record<string, Error>
    routes?: Record<string, Error>
    census?: Partial<Record<CensusId, Error>>
  }
}): MetadataFetcher => ({
  getLinesByModes: async () => {
    if (input.failures?.lines) throw input.failures.lines
    return input.lines ?? []
  },
  getStopPoints: async (lineId) => {
    const failure = input.failures?.stops?.[lineId]
    if (failure) throw failure
    return input.stops?.[lineId] ?? []
  },
  getRouteSequence: async (lineId, direction) => {
    const key = `${lineId}:${direction}`
    const failure = input.failures?.routes?.[key]
    if (failure) throw failure
    return (
      input.routes?.[key] ?? {
        lineId,
        direction,
        orderedLineRoutes: [],
        stopPointSequences: [],
      }
    )
  },
  getCensusCount: async (id) => {
    const failure = input.failures?.census?.[id]
    if (failure) throw failure
    return input.census?.[id] ?? VERIFIED_CENSUS_COUNTS[id]
  },
})
