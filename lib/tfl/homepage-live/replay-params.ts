/** Recorded fixtures `?replay=<name>` can load. */
export const REPLAY_FIXTURES = {
  kx: "13 Nov 2026, 06:44 to 06:54 London time",
} as const

export type ReplayFixtureName = keyof typeof REPLAY_FIXTURES

export const REPLAY_ROUND_SECONDS = 30
export const REPLAY_LAST_ROUND = 20
/** Rounds fed to the engine before the chosen one, so a replay frame is the same however it is reached. */
export const REPLAY_WARMUP_ROUNDS = 4

export type ReplayRequest = {
  fixture: ReplayFixtureName
  round: number
  /** Holds TfL's search answer back, so a screenshot can catch the index rows before the merge. */
  searchDelayMs?: number
}

export const MAX_SEARCH_DELAY_MS = 10_000

type Params = Record<string, string | string[] | undefined>

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value

/** `?replay=kx&t=300` is the 300 s frame (round 10) of the recording; anything else is the live site. */
export const parseReplayParams = (params: Params): ReplayRequest | undefined => {
  const name = first(params.replay)?.trim().toLowerCase()
  if (!name || !(name in REPLAY_FIXTURES)) return undefined
  const seconds = Number(first(params.t) ?? 0)
  const round = Number.isFinite(seconds)
    ? Math.round(seconds / REPLAY_ROUND_SECONDS)
    : 0
  const delay = Number(first(params.searchDelay))
  return {
    fixture: name as ReplayFixtureName,
    round: Math.min(REPLAY_LAST_ROUND, Math.max(0, round)),
    ...(Number.isFinite(delay) && delay > 0
      ? { searchDelayMs: Math.min(MAX_SEARCH_DELAY_MS, Math.round(delay)) }
      : {}),
  }
}

/** The round indices a replay frame needs, oldest first. */
export const replayRoundsFor = (request: ReplayRequest): number[] => {
  const from = Math.max(0, request.round - REPLAY_WARMUP_ROUNDS)
  return Array.from({ length: request.round - from + 1 }, (_, i) => from + i)
}
