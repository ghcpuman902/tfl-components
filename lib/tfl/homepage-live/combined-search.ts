import type { LiveStopHit, StopRow } from "@/lib/tfl/stop-index"

export const MIN_LIVE_QUERY = 2
export const LIVE_DEBOUNCE_MS = 180
export const LIVE_SLOW_MS = 120
export const LIVE_TIMEOUT_MS = 8_000
export const MAX_ENRICH_IDS = 8

export const SEARCH_FAILED = "Bus stop search is unavailable right now. The list above still works."
export const SEARCH_TIMEOUT = "Bus stop search took too long. The list above still works."
export const NO_PLACES = "No stations or bus stops match that."

export type LiveStatus = "idle" | "pending" | "slow" | "ok" | "failed"

export type CombinedState = {
  query: string
  attempt: number
  status: LiveStatus
  /** The list on screen: index rows first, TfL extras appended below. */
  rows: StopRow[]
  message?: string
}

export const initialCombinedState: CombinedState = {
  query: "",
  attempt: 0,
  status: "idle",
  rows: [],
}

export type Merge = (instant: readonly StopRow[], live: readonly LiveStopHit[]) => StopRow[]

export type RowDetails = Pick<StopRow, "letter" | "towards" | "lines">

export type CombinedAction =
  | { type: "typed"; query: string; attempt: number; instant: StopRow[] }
  | { type: "instant"; attempt: number; rows: StopRow[] }
  | { type: "slow"; attempt: number }
  | { type: "live"; attempt: number; hits: readonly LiveStopHit[]; merge: Merge }
  | { type: "enriched"; attempt: number; details: Record<string, Partial<RowDetails>> }
  | { type: "failed"; attempt: number }
  | { type: "timeout"; attempt: number }

const fold = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, "")

const union = (a: readonly string[], b: readonly string[] | undefined) =>
  b?.length ? [...new Set([...a, ...b])].sort() : a

/**
 * Index rows paint on the keystroke, TfL's rows are laid under them later.
 * Rows never move, are never removed by a late answer, and a result or failure
 * for an older keystroke is ignored.
 */
export const combinedReducer = (
  state: CombinedState,
  action: CombinedAction
): CombinedState => {
  if (action.type === "typed")
    return {
      query: action.query,
      attempt: action.attempt,
      status: fold(action.query).length >= MIN_LIVE_QUERY ? "pending" : "idle",
      rows: action.instant,
    }
  if (action.attempt !== state.attempt) return state
  switch (action.type) {
    case "instant":
      // The index arrived after the keystroke; only a list with no TfL rows yet may be replaced.
      return state.rows.some((row) => row.liveOnly) || state.status === "ok"
        ? state
        : { ...state, rows: action.rows }
    case "slow":
      return state.status === "pending" ? { ...state, status: "slow" } : state
    case "live": {
      const rows = action.merge(state.rows, action.hits)
      return { ...state, status: "ok", message: undefined, rows }
    }
    case "enriched": {
      let changed = false
      const rows = state.rows.map((row) => {
        const details = action.details[row.id]
        if (!details || !row.liveOnly) return row
        const next: StopRow = {
          ...row,
          letter: row.letter ?? details.letter,
          towards: row.towards ?? details.towards,
          lines: union(row.lines, details.lines),
        }
        if (
          next.letter === row.letter &&
          next.towards === row.towards &&
          next.lines === row.lines
        )
          return row
        changed = true
        return next
      })
      return changed ? { ...state, rows } : state
    }
    case "failed":
      return { ...state, status: "failed", message: SEARCH_FAILED }
    case "timeout":
      return state.status === "pending" || state.status === "slow"
        ? { ...state, status: "failed", message: SEARCH_TIMEOUT }
        : state
  }
}

type Handle = unknown
export type Timers = {
  set: (fn: () => void, ms: number) => Handle
  clear: (handle: Handle) => void
}

const realTimers: Timers = {
  set: (fn, ms) => setTimeout(fn, ms),
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
}

export type LiveSearchDeps = {
  /** Resolves with TfL's matches; throws on failure. Must stop work when `signal` aborts. */
  fetchLive: (query: string, signal: AbortSignal) => Promise<readonly LiveStopHit[]>
  /** Fills painted letter and routes for hits that came without them. */
  enrich?: (
    ids: readonly string[],
    signal: AbortSignal
  ) => Promise<Record<string, Partial<RowDetails>>>
  instantFor: (query: string) => StopRow[]
  merge: () => Merge
  dispatch: (action: CombinedAction) => void
  debounceMs?: number
  slowMs?: number
  timeoutMs?: number
  timers?: Timers
}

export type LiveSearch = {
  type: (query: string) => void
  /** The index finished loading: show its rows for the current query if TfL has not answered. */
  indexReady: () => void
  dispose: () => void
}

const hitId = (hit: LiveStopHit) => hit.id ?? hit.naptanId

/**
 * One request per pause in typing. A new keystroke aborts the request in flight,
 * and an attempt number makes a late answer harmless even when the abort is missed.
 */
export const createLiveSearch = (deps: LiveSearchDeps): LiveSearch => {
  const timers = deps.timers ?? realTimers
  const debounceMs = deps.debounceMs ?? LIVE_DEBOUNCE_MS
  const slowMs = deps.slowMs ?? LIVE_SLOW_MS
  const timeoutMs = deps.timeoutMs ?? LIVE_TIMEOUT_MS
  let attempt = 0
  let query = ""
  let pending: Handle[] = []
  let controller: AbortController | undefined

  const reset = () => {
    controller?.abort()
    controller = undefined
    pending.forEach((handle) => timers.clear(handle))
    pending = []
  }

  const run = (forAttempt: number, forQuery: string) => {
    const mine = new AbortController()
    controller = mine
    const current = () => attempt === forAttempt && !mine.signal.aborted
    pending.push(
      timers.set(() => current() && deps.dispatch({ type: "slow", attempt: forAttempt }), slowMs),
      timers.set(() => {
        if (!current()) return
        mine.abort()
        deps.dispatch({ type: "timeout", attempt: forAttempt })
      }, timeoutMs)
    )
    void (async () => {
      try {
        const hits = await deps.fetchLive(forQuery, mine.signal)
        if (!current()) return
        deps.dispatch({ type: "live", attempt: forAttempt, hits, merge: deps.merge() })
        const ids = hits
          .filter((hit) => !hit.stopLetter && !hit.lines?.length)
          .flatMap((hit) => hitId(hit) ?? [])
          .slice(0, MAX_ENRICH_IDS)
        if (ids.length === 0 || !deps.enrich) return
        const details = await deps.enrich(ids, mine.signal)
        if (current()) deps.dispatch({ type: "enriched", attempt: forAttempt, details })
      } catch {
        if (current()) deps.dispatch({ type: "failed", attempt: forAttempt })
      }
    })()
  }

  return {
    type: (next) => {
      reset()
      attempt += 1
      query = next
      deps.dispatch({ type: "typed", query: next, attempt, instant: deps.instantFor(next) })
      if (fold(next).length < MIN_LIVE_QUERY) return
      const forAttempt = attempt
      pending.push(timers.set(() => run(forAttempt, next), debounceMs))
    },
    indexReady: () =>
      deps.dispatch({ type: "instant", attempt, rows: deps.instantFor(query) }),
    dispose: reset,
  }
}

/** Used when the index could not load: TfL's hits are the whole list. */
export const appendLiveOnly: Merge = (instant, live) => {
  const seen = new Set(instant.map((row) => row.id))
  const extra: StopRow[] = []
  for (const hit of live) {
    const id = hitId(hit)
    if (!id || seen.has(id)) continue
    seen.add(id)
    extra.push({
      id,
      name: hit.commonName ?? hit.name ?? id,
      kind: "bus",
      letter: hit.stopLetter,
      towards: hit.towards,
      lat: hit.lat,
      lon: hit.lon,
      lines: (hit.lines ?? []).flatMap((l) => (typeof l === "string" ? l : (l.id ?? []))),
      modes: hit.modes ?? ["bus"],
      liveOnly: true,
    })
  }
  return extra.length ? [...instant, ...extra] : (instant as StopRow[])
}
