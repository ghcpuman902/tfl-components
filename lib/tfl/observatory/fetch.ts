import { getTflClient } from "@/lib/tfl/client"
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
}

const asRawLines = (value: unknown): RawLine[] =>
  Array.isArray(value) ? (value as RawLine[]) : []

const asRawStops = (value: unknown): RawStopPoint[] =>
  Array.isArray(value) ? (value as RawStopPoint[]) : []

/**
 * Live Unified API reads through the site tfl-ts client.
 * The observatory baseline is independent of tfl-ts snapshots.
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
  }
}

export const createStaticMetadataFetcher = (input: {
  lines?: RawLine[]
  stops?: Record<string, RawStopPoint[]>
  routes?: Record<string, RawRouteSequence>
  failures?: {
    lines?: Error
    stops?: Record<string, Error>
    routes?: Record<string, Error>
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
})
