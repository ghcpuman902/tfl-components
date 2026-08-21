/**
 * Staged Board builder draft. One persistent draft per browser.
 * Analytics must never receive keys, coordinates, or raw searches.
 */

import {
  boardSlotsInclude,
  resolveBoardSlots,
} from "@/lib/tfl/board-panels"
import type { BoardConfig } from "@/lib/tfl/board-url-state"

export const BOARD_SETUP_STAGES = [1, 2, 3, 4, 5] as const
export type BoardSetupStage = (typeof BOARD_SETUP_STAGES)[number]

export type BoardScreenProfile = "small" | "large"
export type BoardSetupKeyMode = "own" | "shared" | "skipped"
export type BoardNearbyMode = "bus" | "river" | "cycle"

export const BOARD_SETUP_DRAFT_STORAGE_KEY = "tfl-board-setup-draft.v1"

export type BoardSetupDraft = {
  id: string
  stage: BoardSetupStage
  screenProfile: BoardScreenProfile | null
  stopId: string | null
  stopName: string | null
  continueWithoutStop: boolean
  locationUsed: boolean
  lineIds: readonly string[]
  nearbyModes: readonly BoardNearbyMode[]
  busStopId: string | null
  riverStopId: string | null
  cycleDockIds: readonly string[]
  statusLineIds: readonly string[]
  /** When true, status shows only the priority set (`s.overview=selection`). */
  statusOnlyThese: boolean
  keyMode: BoardSetupKeyMode | null
  setupStarted: boolean
  completedStages: readonly BoardSetupStage[]
  setupCompleted: boolean
}

export const BOARD_STAGE_LABELS: Record<BoardSetupStage, string> = {
  1: "Screen",
  2: "Stop",
  3: "Services",
  4: "Live data",
  5: "Ready",
}

const isStage = (value: unknown): value is BoardSetupStage =>
  value === 1 || value === 2 || value === 3 || value === 4 || value === 5

const isScreenProfile = (value: unknown): value is BoardScreenProfile =>
  value === "small" || value === "large"

const isKeyMode = (value: unknown): value is BoardSetupKeyMode =>
  value === "own" || value === "shared" || value === "skipped"

const isNearbyMode = (value: unknown): value is BoardNearbyMode =>
  value === "bus" || value === "river" || value === "cycle"

export const createBoardSetupDraft = (id = "pending"): BoardSetupDraft => ({
  id,
  stage: 1,
  screenProfile: null,
  stopId: null,
  stopName: null,
  continueWithoutStop: false,
  locationUsed: false,
  lineIds: [],
  nearbyModes: [],
  busStopId: null,
  riverStopId: null,
  cycleDockIds: [],
  statusLineIds: [],
  statusOnlyThese: false,
  keyMode: null,
  setupStarted: false,
  completedStages: [],
  setupCompleted: false,
})

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

export const parseBoardSetupDraft = (value: unknown): BoardSetupDraft | null => {
  if (!isRecord(value)) return null
  if (typeof value.id !== "string" || !value.id) return null
  if (!isStage(value.stage)) return null

  const completedStages = Array.isArray(value.completedStages)
    ? value.completedStages.filter(isStage)
    : []

  return {
    id: value.id,
    stage: value.stage,
    screenProfile: isScreenProfile(value.screenProfile)
      ? value.screenProfile
      : null,
    stopId: typeof value.stopId === "string" ? value.stopId : null,
    stopName: typeof value.stopName === "string" ? value.stopName : null,
    continueWithoutStop: value.continueWithoutStop === true,
    locationUsed: value.locationUsed === true,
    lineIds: Array.isArray(value.lineIds)
      ? value.lineIds.filter((item): item is string => typeof item === "string")
      : [],
    nearbyModes: Array.isArray(value.nearbyModes)
      ? value.nearbyModes.filter(isNearbyMode)
      : [],
    busStopId: typeof value.busStopId === "string" ? value.busStopId : null,
    riverStopId: typeof value.riverStopId === "string" ? value.riverStopId : null,
    cycleDockIds: Array.isArray(value.cycleDockIds)
      ? value.cycleDockIds.filter((item): item is string => typeof item === "string")
      : [],
    statusLineIds: Array.isArray(value.statusLineIds)
      ? value.statusLineIds.filter(
          (item): item is string => typeof item === "string"
        )
      : [],
    statusOnlyThese: value.statusOnlyThese === true,
    keyMode: isKeyMode(value.keyMode) ? value.keyMode : null,
    setupStarted: value.setupStarted === true,
    completedStages,
    setupCompleted: value.setupCompleted === true,
  }
}

/** First Continue or a change from the recommended screen starts setup. */
export const markBoardSetupStarted = (draft: BoardSetupDraft): BoardSetupDraft => {
  if (draft.setupStarted) return draft
  return { ...draft, setupStarted: true }
}

export const completeBoardStage = (
  draft: BoardSetupDraft,
  stage: BoardSetupStage
): BoardSetupDraft => {
  if (draft.completedStages.includes(stage)) {
    return {
      ...draft,
      stage: stage < 5 ? ((stage + 1) as BoardSetupStage) : 5,
    }
  }
  return {
    ...draft,
    stage: stage < 5 ? ((stage + 1) as BoardSetupStage) : 5,
    completedStages: [...draft.completedStages, stage],
  }
}

/** Fires once per draft on the first of: open fullscreen, copy link, or a rendered QR. */
export const markBoardSetupCompleted = (
  draft: BoardSetupDraft
): { draft: BoardSetupDraft; firstCompletion: boolean } => {
  if (draft.setupCompleted) {
    return { draft, firstCompletion: false }
  }
  return {
    draft: { ...draft, setupCompleted: true },
    firstCompletion: true,
  }
}

export const goToBoardStage = (
  draft: BoardSetupDraft,
  stage: BoardSetupStage
): BoardSetupDraft => ({ ...draft, stage })

export const detectScreenProfile = (
  width: number,
  height: number
): {
  profile: BoardScreenProfile
  orientation: "portrait" | "landscape"
} => {
  const orientation = width >= height ? "landscape" : "portrait"
  const profile: BoardScreenProfile =
    orientation === "landscape" || width >= 768 ? "large" : "small"
  return { profile, orientation }
}

export const BOARD_PREVIEW_SMALL_FRAME = { width: 390, height: 844 } as const
/** Matches the landing-hero iPad screen aspect (110.3998 × 82.2392). */
export const BOARD_PREVIEW_LARGE_FRAME = { width: 1280, height: 953 } as const

export type BoardPreviewFrame = {
  width: number
  height: number
  chrome: "phone" | "none"
  density: "compact" | "roomy"
}

/** Small = narrow/phone frame. Large = wide frame. Never fitted to the current viewport. */
export const previewFrameForProfile = (
  profile: BoardScreenProfile
): BoardPreviewFrame => {
  if (profile === "small") {
    return { ...BOARD_PREVIEW_SMALL_FRAME, chrome: "phone", density: "compact" }
  }
  return { ...BOARD_PREVIEW_LARGE_FRAME, chrome: "none", density: "roomy" }
}

const IMPORTED_COMPLETED_STAGES: readonly BoardSetupStage[] = [1, 2, 3, 4]

/** Map a live board URL into a completed Ready-stage draft. */
export const draftFromBoardConfig = (
  config: BoardConfig,
  options?: { id?: string; screenProfile?: BoardScreenProfile | null }
): BoardSetupDraft => {
  const slots = resolveBoardSlots(config.slots.p1, config.slots.p2)
  const hasRail = boardSlotsInclude(slots, "rail")
  const hasBus =
    boardSlotsInclude(slots, "bus") || Boolean(config.bus.stop)
  const hasRiver =
    boardSlotsInclude(slots, "river") || Boolean(config.river.stop)
  const hasCycle =
    boardSlotsInclude(slots, "cycle") ||
    (config.cycle.docks?.length ?? 0) > 0
  const hasStatus = boardSlotsInclude(slots, "status")
  const stopId = config.stop?.trim() || null
  const nearbyModes: BoardNearbyMode[] = []
  if (hasBus) nearbyModes.push("bus")
  if (hasRiver) nearbyModes.push("river")
  if (hasCycle) nearbyModes.push("cycle")

  return {
    id: options?.id ?? "pending",
    stage: 5,
    screenProfile: options?.screenProfile ?? null,
    stopId,
    stopName: config.stopName?.trim() || null,
    continueWithoutStop: !stopId && !hasRail && hasStatus,
    locationUsed: false,
    lineIds: [...(config.arrivals.lineOrder ?? [])],
    nearbyModes,
    busStopId: config.bus.stop?.trim() || null,
    riverStopId: config.river.stop?.trim() || null,
    cycleDockIds: [...(config.cycle.docks ?? [])],
    statusLineIds: [...(config.status.lines ?? [])],
    statusOnlyThese: config.status.overview === "selection",
    keyMode: config.key?.trim() ? "shared" : "skipped",
    setupStarted: true,
    completedStages: IMPORTED_COMPLETED_STAGES,
    setupCompleted: true,
  }
}

/**
 * URL settings the draft does not own (rows, tiles, behaviour, slots, key).
 * Status overview is owned by `statusOnlyThese` on the draft.
 * `mergeBoardConfig(configFromDraft(draft), leftover)` should match the live board.
 */
export const leftoverBoardConfig = (
  config: BoardConfig
): Partial<BoardConfig> => {
  const leftover: Partial<BoardConfig> = {
    behaviour: config.behaviour,
    slots: config.slots,
  }
  const key = config.key?.trim()
  if (key) leftover.key = key

  const arrivals: BoardConfig["arrivals"] = {}
  if (config.arrivals.rows !== undefined) arrivals.rows = config.arrivals.rows
  if (config.arrivals.pinFirst !== undefined) {
    arrivals.pinFirst = config.arrivals.pinFirst
  }
  if (Object.keys(arrivals).length > 0) leftover.arrivals = arrivals

  const bus: BoardConfig["bus"] = {}
  if (config.bus.routes) bus.routes = config.bus.routes
  if (config.bus.rows !== undefined) bus.rows = config.bus.rows
  if (Object.keys(bus).length > 0) leftover.bus = bus

  const river: BoardConfig["river"] = {}
  if (config.river.rows !== undefined) river.rows = config.river.rows
  if (Object.keys(river).length > 0) leftover.river = river

  const cycle: BoardConfig["cycle"] = {}
  if (config.cycle.surface) cycle.surface = config.cycle.surface
  if (config.cycle.tiles !== undefined) cycle.tiles = config.cycle.tiles
  if (Object.keys(cycle).length > 0) leftover.cycle = cycle

  const status: BoardConfig["status"] = {}
  if (config.status.surface) status.surface = config.status.surface
  if (config.status.tiles !== undefined) status.tiles = config.status.tiles
  if (config.status.dwell !== undefined) status.dwell = config.status.dwell
  if (Object.keys(status).length > 0) leftover.status = status

  return leftover
}
