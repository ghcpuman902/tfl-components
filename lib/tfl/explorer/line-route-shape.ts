import type TflClient from "tfl-ts"
import type { ExplorerLineRoute } from "@/lib/tfl/explorer/common"
import { stopsFromRiverOrderedRoutes } from "@/lib/tfl/explorer/river-route"

type LineGetResult = Awaited<ReturnType<TflClient["line"]["get"]>>
type RouteSequenceResult = Awaited<
  ReturnType<TflClient["line"]["getRouteSequence"]>
>

/**
 * Shapes a raw `line.get` + `line.getRouteSequence` pair into the normalised
 * `ExplorerLineRoute`. Pure, no server-only imports — safe to call from the
 * cached seed fetch (site key, `lib/tfl/explorer/lines-tube-rail.ts`) or the
 * keyed live fetch for any other line (visitor key, in `LineInspector`).
 */
export const shapeExplorerLineRoute = (
  lineId: string,
  lines: LineGetResult,
  sequence: RouteSequenceResult
): ExplorerLineRoute => {
  const riverStops =
    sequence.mode === "river-bus" || lines[0]?.modeName === "river-bus"
      ? stopsFromRiverOrderedRoutes({
          mode: "river-bus",
          orderedLineRoutes: sequence.orderedLineRoutes,
          stations: sequence.stations,
          stopPointSequences: sequence.stopPointSequences,
        })
      : null

  return {
    line: lines[0]
      ? {
          id: lines[0].id,
          name: lines[0].name,
          modeName: lines[0].modeName,
        }
      : { id: lineId },
    stops:
      riverStops ??
      sequence.stopPointSequences?.flatMap((seq) => seq.stopPoint ?? []) ??
      [],
  }
}
