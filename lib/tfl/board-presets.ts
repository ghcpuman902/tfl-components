/**
 * Hosted Board layout recipes. Each recipe allowlists Config fields and
 * authors slot stacks. The URL does not name the recipe (J13).
 */

import type { BoardSettingId } from "@/lib/tfl/board-settings"
import type { BoardPanelKind } from "@/lib/tfl/board-panels"
import type { BoardConfig } from "@/lib/tfl/board-url-state"

export type BoardPresetId = "station" | "near" | "arrivals" | "status"

export type BoardPresetDef = {
  id: BoardPresetId
  title: string
  description: string
  available: boolean
  formSettings: readonly BoardSettingId[]
  slots: {
    p1: readonly BoardPanelKind[]
    p2: readonly BoardPanelKind[]
  }
}

const STATION_FORM: readonly BoardSettingId[] = [
  "stop",
  "stopName",
  "behaviour",
  "arrivalsLines",
  "arrivalsRows",
  "arrivalsPinFirst",
  "statusSurface",
  "statusTiles",
  "statusLines",
  "statusOverview",
]

export const BOARD_PRESETS: readonly BoardPresetDef[] = [
  {
    id: "station",
    title: "Station + status",
    description:
      "One station’s arrivals and network status. Optional line filter.",
    available: true,
    formSettings: STATION_FORM,
    slots: { p1: ["rail"], p2: ["status"] },
  },
  {
    id: "near",
    title: "Near me",
    description:
      "Nearest rail, bus, and cycle docks, plus status. Locate to pin ids.",
    available: true,
    formSettings: [
      ...STATION_FORM,
      "busStop",
      "busRoutes",
      "busRows",
      "riverStop",
      "riverRows",
      "cycleDocks",
      "cycleTiles",
    ],
    slots: { p1: ["rail", "bus", "cycle"], p2: ["status"] },
  },
  {
    id: "arrivals",
    title: "Arrivals only",
    description: "One panel — rail, or switch the slot to bus or river.",
    available: true,
    formSettings: [
      "stop",
      "stopName",
      "behaviour",
      "arrivalsLines",
      "arrivalsRows",
      "arrivalsPinFirst",
      "busStop",
      "busRoutes",
      "busRows",
      "riverStop",
      "riverRows",
    ],
    slots: { p1: ["rail"], p2: [] },
  },
  {
    id: "status",
    title: "Status only",
    description: "Network status in a single panel.",
    available: true,
    formSettings: [
      "behaviour",
      "statusSurface",
      "statusTiles",
      "statusLines",
      "statusOverview",
    ],
    slots: { p1: ["status"], p2: [] },
  },
]

export const DEFAULT_BOARD_PRESET_ID: BoardPresetId = "station"

export const getBoardPreset = (id: BoardPresetId): BoardPresetDef =>
  BOARD_PRESETS.find((preset) => preset.id === id) ?? BOARD_PRESETS[0]!

export const applyBoardRecipe = (
  current: BoardConfig,
  preset: BoardPresetDef
): BoardConfig => ({
  ...current,
  slots: {
    p1: [...preset.slots.p1],
    p2: [...preset.slots.p2],
  },
})
