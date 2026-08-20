/**
 * Board URL specification derived from the parser and setting definitions.
 * Do not add parameters that `parseBoardConfig` / `BOARD_SETTINGS` do not own.
 */

import { HOME_RAIL_STOP } from "@/lib/tfl/home-arrivals-stops"
import {
  BOARD_SETTINGS,
  URL_BOARD_SETTING_IDS,
  type BoardSettingId,
} from "@/lib/tfl/board-settings"
import {
  BOARD_VIEW_PATH,
  buildBoardHref,
  DEFAULT_BOARD_CONFIG,
} from "@/lib/tfl/board-url-state"

export type BoardUrlParamLocation = "fragment"

export type BoardUrlParamSpec = {
  param: string
  setting: BoardSettingId | "key"
  required: boolean
  optional: boolean
  type: string
  defaultLabel: string
  location: BoardUrlParamLocation
  label: string
  help?: string
  repeated: boolean
}

const settingType = (id: BoardSettingId): string => {
  const setting = BOARD_SETTINGS[id]
  if (setting.kind === "list") return "comma-separated list"
  if (id === "arrivalsRows") return "integer or comma-separated integers"
  if (id === "arrivalsPinFirst") return "boolean"
  if (
    id === "behaviour" ||
    id === "statusSurface" ||
    id === "statusOverview"
  ) {
    return "enum"
  }
  if (
    id === "busRows" ||
    id === "riverRows" ||
    id === "cycleTiles" ||
    id === "statusTiles" ||
    id === "statusDwell"
  ) {
    return "integer"
  }
  return "string"
}

const defaultLabel = (id: BoardSettingId): string => {
  const setting = BOARD_SETTINGS[id]
  const value = setting.defaultValue
  if (value === undefined || (Array.isArray(value) && value.length === 0)) {
    return "omitted"
  }
  if (Array.isArray(value)) return value.join(",")
  if (typeof value === "boolean") return value ? "true" : "false"
  return String(value)
}

export const getBoardUrlParamSpecs = (): readonly BoardUrlParamSpec[] => {
  const fromSettings = URL_BOARD_SETTING_IDS.map((id) => {
    const setting = BOARD_SETTINGS[id]
    return {
      param: setting.param,
      setting: id,
      required: false,
      optional: true,
      type: settingType(id),
      defaultLabel: defaultLabel(id),
      location: "fragment" as const,
      label: setting.ui?.label ?? setting.param,
      help:
        setting.ui && "help" in setting.ui
          ? (setting.ui.help as string | undefined)
          : undefined,
      repeated: setting.kind === "list" || id === "arrivalsRows",
    }
  })

  return [
    ...fromSettings,
    {
      param: "key",
      setting: "key",
      required: false,
      optional: true,
      type: "string",
      defaultLabel: "omitted",
      location: "fragment",
      label: "TfL API key",
      help: "Stays in the fragment so it is not sent to this origin. Treat the full link as a secret.",
      repeated: false,
    },
  ]
}

export const BOARD_URL_IGNORED_PARAMS = ["mode", "fit"] as const

export const BOARD_URL_EXAMPLES = {
  arrivalsAndStatus: buildBoardHref({ stop: HOME_RAIL_STOP.id }),
  arrivalsOnly: buildBoardHref({
    stop: HOME_RAIL_STOP.id,
    slots: { p1: ["rail"], p2: [] },
  }),
  statusOnly: buildBoardHref({
    stop: HOME_RAIL_STOP.id,
    slots: { p1: ["status"], p2: [] },
  }),
  noStopStatus: buildBoardHref({
    slots: { p1: ["status"], p2: [] },
  }),
  /** Same fragment as arrivals + status — layout follows the viewport. */
  portraitSmallScreen: buildBoardHref({ stop: HOME_RAIL_STOP.id }),
} as const

export const BOARD_URL_COMPLETE_EXAMPLE = buildBoardHref({
  stop: HOME_RAIL_STOP.id,
  stopName: HOME_RAIL_STOP.name,
  behaviour: "unattended",
  slots: { p1: ["rail"], p2: ["status"] },
  arrivals: { rows: 3, lineOrder: ["victoria", "central", "bakerloo"] },
})

export const BOARD_URL_PATH = BOARD_VIEW_PATH
export const BOARD_URL_DEFAULT_BEHAVIOUR = DEFAULT_BOARD_CONFIG.behaviour

export const boardUrlSpecParamNames = (): readonly string[] =>
  getBoardUrlParamSpecs().map((item) => item.param)
