/**
 * Staged Board builder draft. One persistent draft per browser.
 * Analytics must never receive keys, coordinates, or raw searches.
 */

export const BOARD_SETUP_STAGES = [1, 2, 3, 4, 5] as const
export type BoardSetupStage = (typeof BOARD_SETUP_STAGES)[number]

export type BoardScreenProfile = "this" | "small" | "large"
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
  statusLineIds: readonly string[]
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
  value === "this" || value === "small" || value === "large"

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
  statusLineIds: [],
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
    statusLineIds: Array.isArray(value.statusLineIds)
      ? value.statusLineIds.filter(
          (item): item is string => typeof item === "string"
        )
      : [],
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

/** Fires once per draft on the first of: open fullscreen, copy link, QR ready. */
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
  sizeLabel: string
} => {
  const orientation = width >= height ? "landscape" : "portrait"
  const shortest = Math.min(width, height)
  const profile: BoardScreenProfile =
    shortest < 500 ? "small" : shortest > 900 ? "large" : "this"
  return {
    profile,
    orientation,
    sizeLabel: `${Math.round(width)}×${Math.round(height)} ${orientation}`,
  }
}
