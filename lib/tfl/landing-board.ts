import type { BoardArrivalsStopIdsIndex } from "@/lib/tfl/board-arrivals-stop-ids"
import { getBoardArrivalsStopIdsIndex } from "@/lib/tfl/board-arrivals-stop-ids"
import { formatBikePointId } from "@/lib/tfl/board-panels"
import type { BoardStationLinesIndex } from "@/lib/tfl/board-station-lines"
import { getBoardStationLinesIndex } from "@/lib/tfl/board-station-lines"
import type { BoardStationNamesIndex } from "@/lib/tfl/board-station-names"
import { getBoardStationNamesIndex } from "@/lib/tfl/board-station-names"
import {
  DEFAULT_BOARD_CONFIG,
  type BoardConfig,
  type BoardCycleConfig,
  type BoardPanelKind,
} from "@/lib/tfl/board-url-state"

/** Compact indexes for the homepage journey boards. Not the full catalog. */
export type LandingBoardIndexes = {
  stationLines: BoardStationLinesIndex
  stationNames: BoardStationNamesIndex
  arrivalsStopIds: BoardArrivalsStopIdsIndex
}

export type LandingBoardPreset = {
  id: string
  /** Hover / accessible name for the commute this board stands in for. */
  label: string
  config: BoardConfig
}

const stacked = (
  p1: readonly BoardPanelKind[],
  rest: Partial<BoardConfig>
): BoardConfig => ({
  ...DEFAULT_BOARD_CONFIG,
  ...rest,
  slots: { p1, p2: ["status"] },
  arrivals: { ...DEFAULT_BOARD_CONFIG.arrivals, ...rest.arrivals },
  bus: { ...DEFAULT_BOARD_CONFIG.bus, ...rest.bus },
  river: { ...DEFAULT_BOARD_CONFIG.river, ...rest.river },
  cycle: { ...DEFAULT_BOARD_CONFIG.cycle, ...rest.cycle },
  status: { ...DEFAULT_BOARD_CONFIG.status, ...rest.status },
})

const cycleDocks = (docks: readonly string[]): BoardCycleConfig => ({
  docks,
  surface: docks.length <= 1 ? "display" : "map",
})

/**
 * Live homepage boards. First is Clapham Common (Northern + 77 + nearby
 * docks). Home-button cycles the rest. `490G00012162` is a stop-area — the
 * board polls the eastbound child (`490012162E`, 77 to Waterloo).
 */
export const LANDING_BOARD_PRESETS: readonly LandingBoardPreset[] = [
  {
    id: "clapham-common",
    label: "Clapham Common to Bank",
    config: stacked(["rail", "bus", "cycle"], {
      stop: "940GZZLUCPC",
      stopName: "Clapham Common",
      arrivals: { lineOrder: ["northern"] },
      bus: { stop: "490012162E" },
      cycle: cycleDocks(["BikePoints_612", "BikePoints_677"]),
      status: { lines: ["northern"], overview: "network" },
    }),
  },
  {
    id: "stoke-newington",
    label: "Stoke Newington to Shoreditch",
    config: stacked(["rail", "bus", "cycle"], {
      stop: "910GSTKNWNG",
      stopName: "Stoke Newington",
      arrivals: { lineOrder: ["weaver"] },
      bus: { stop: "490001273C" },
      cycle: cycleDocks(["BikePoints_883", "BikePoints_132"]),
      status: { lines: ["weaver"], overview: "network" },
    }),
  },
  {
    id: "parsons-green",
    label: "Parsons Green to Oxford Circus",
    config: stacked(["rail", "bus", "cycle"], {
      stop: "940GZZLUPSG",
      stopName: "Parsons Green",
      arrivals: { lineOrder: ["district"] },
      bus: { stop: "490015575X" },
      cycle: cycleDocks(["BikePoints_671", "BikePoints_596"]),
      status: {
        lines: ["district", "piccadilly", "victoria"],
        overview: "network",
      },
    }),
  },
  {
    id: "ealing-broadway",
    label: "Ealing Broadway to Canary Wharf",
    config: stacked(["rail"], {
      stop: "940GZZLUEBY",
      stopName: "Ealing Broadway",
      arrivals: { lineOrder: ["elizabeth", "central", "district"] },
      status: {
        lines: ["elizabeth", "central", "jubilee", "waterloo-city"],
        overview: "network",
      },
    }),
  },
  {
    id: "greenwich",
    label: "Greenwich to the City",
    config: stacked(["rail", "river", "cycle"], {
      stop: "940GZZDLGRE",
      stopName: "Greenwich",
      arrivals: { lineOrder: ["dlr"] },
      river: { stop: "930GGNW" },
      cycle: cycleDocks(["BikePoints_481", "BikePoints_476"]),
      status: { lines: ["dlr"], overview: "network" },
    }),
  },
]

export const LANDING_BOARD_DEFAULT = LANDING_BOARD_PRESETS[0]!

export const LANDING_DEMO_STOP_IDS: readonly string[] = [
  ...new Set(
    LANDING_BOARD_PRESETS.flatMap((preset) => {
      const { stop, bus, river } = preset.config
      return [stop, bus.stop, river.stop].filter(
        (id): id is string => Boolean(id?.trim())
      )
    })
  ),
]

export const LANDING_DEMO_DOCK_IDS: readonly string[] = [
  ...new Set(
    LANDING_BOARD_PRESETS.flatMap((preset) =>
      (preset.config.cycle.docks ?? []).map((id) => formatBikePointId(id))
    ).filter(Boolean)
  ),
]

const nextLandingPresetIndex = (index: number): number =>
  (index + 1) % LANDING_BOARD_PRESETS.length

export const landingBoardPresetAt = (index: number): LandingBoardPreset =>
  LANDING_BOARD_PRESETS[
    ((index % LANDING_BOARD_PRESETS.length) + LANDING_BOARD_PRESETS.length) %
      LANDING_BOARD_PRESETS.length
  ]!

export const nextLandingBoardHint = (index: number): string =>
  `Show ${landingBoardPresetAt(nextLandingPresetIndex(index)).label}`

export const getLandingBoardIndexes = (): LandingBoardIndexes => {
  const lines = getBoardStationLinesIndex()
  const names = getBoardStationNamesIndex()
  const arrivals = getBoardArrivalsStopIdsIndex()
  const stationLines: Record<string, BoardStationLinesIndex[string]> = {}
  const stationNames: Record<string, string> = {}
  const arrivalsStopIds: Record<string, readonly string[]> = {}

  for (const preset of LANDING_BOARD_PRESETS) {
    const stop = preset.config.stop?.trim()
    if (!stop) continue
    if (lines[stop]) stationLines[stop] = lines[stop]
    const name = names[stop] ?? preset.config.stopName
    if (name) stationNames[stop] = name
    if (arrivals[stop]) arrivalsStopIds[stop] = arrivals[stop]
  }

  return { stationLines, stationNames, arrivalsStopIds }
}
