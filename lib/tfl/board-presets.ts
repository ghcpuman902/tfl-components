/**
 * Hosted Board layout recipes. Each recipe allowlists Config fields and
 * authors slot stacks. The URL does not name the recipe (J13).
 */

import type { BoardSettingId } from "@/lib/tfl/board-settings"
import {
  resolveBoardSlots,
  type BoardPanelKind,
} from "@/lib/tfl/board-panels"
import type { BoardConfig } from "@/lib/tfl/board-url-state"

export type BoardPresetId = "station" | "near" | "arrivals" | "status"

export type BoardPresetDef = {
  id: BoardPresetId
  title: string
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
    available: true,
    formSettings: STATION_FORM,
    slots: { p1: ["rail"], p2: ["status"] },
  },
  {
    id: "near",
    title: "Near me",
    available: true,
    formSettings: [
      ...STATION_FORM,
      "busStop",
      "busRoutes",
      "busRows",
      "riverStop",
      "riverRows",
      "cycleDocks",
      "cycleSurface",
      "cycleTiles",
    ],
    slots: { p1: ["rail", "bus", "cycle"], p2: ["status"] },
  },
  {
    id: "arrivals",
    title: "Arrivals only",
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

/** Infer the layout card from slot stacks. URL does not name the recipe (J13). */
export const matchBoardPresetId = (
  config: Pick<BoardConfig, "slots">
): BoardPresetId | undefined => {
  const resolved = resolveBoardSlots(config.slots.p1, config.slots.p2)
  return BOARD_PRESETS.find(
    (preset) =>
      preset.slots.p1.join(",") === resolved.p1.join(",") &&
      preset.slots.p2.join(",") === resolved.p2.join(",")
  )?.id
}

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
