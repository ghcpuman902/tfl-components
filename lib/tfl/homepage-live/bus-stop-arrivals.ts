import { isTflRateLimitError } from "@/lib/tfl/board-rate-limit"
import {
  admitSiteCall,
  backoffKey,
  BUS_BACKOFF_SEC,
  BUS_ROWS_EXPIRE_SEC,
  rowsKey,
  type QuotaStore,
} from "@/lib/tfl/homepage-live/bus-quota"

export type BusBoardRow = {
  route: string
  destination: string
  towards?: string
  etaSec: number
  vehicleId?: string
}

export const BUS_BUSY = "Live bus times are busy right now. Try again in a minute."
export const BUS_FAILED = "Bus arrivals are unavailable for this stop right now."

/**
 * What the shared cache holds for one stop. `stale` rows are the last good
 * ones, served while the site budget is spent or TfL answered 429.
 */
export type BusStopSnapshot = {
  state: "fresh" | "stale"
  rows: BusBoardRow[]
  /** Epoch ms of the TfL read the rows came from. */
  fetchedAt: number
}

/** Thrown instead of cached: there is nothing honest to show for this stop. */
export class BusStopUnavailable extends Error {
  constructor(readonly kind: "busy" | "failed") {
    super(kind === "busy" ? BUS_BUSY : BUS_FAILED)
  }
}

export type BusRefreshDeps = {
  store: QuotaStore
  /** One TfL call for one stop. */
  fetchRows: (stopId: string) => Promise<BusBoardRow[]>
  now: () => number
}

const lastGood = async (
  stopId: string,
  store: QuotaStore
): Promise<BusStopSnapshot | undefined> => {
  const raw = await store.get(rowsKey(stopId))
  if (!raw) return undefined
  try {
    const held = JSON.parse(raw) as { rows: BusBoardRow[]; fetchedAt: number }
    return { state: "stale", rows: held.rows, fetchedAt: held.fetchedAt }
  } catch {
    return undefined
  }
}

/**
 * One refresh of one stop, run only when the shared cache entry has gone
 * stale, so the budget is spent per refresh and not per visitor:
 * - after a 429 the stop is left alone for 60 s;
 * - over the site's budget, or backed off, the last good rows are served;
 * - with no last good rows, `BusStopUnavailable` says busy (quota) or failed.
 */
export const refreshBusStop = async (
  stopId: string,
  deps: BusRefreshDeps
): Promise<BusStopSnapshot> => {
  const held = () => lastGood(stopId, deps.store)
  const serveHeld = async (kind: "busy" | "failed"): Promise<BusStopSnapshot> => {
    const rows = await held()
    if (rows) return rows
    throw new BusStopUnavailable(kind)
  }
  if (await deps.store.get(backoffKey(stopId))) return serveHeld("busy")
  if (!(await admitSiteCall(deps.store, deps.now()))) return serveHeld("busy")
  try {
    const rows = await deps.fetchRows(stopId)
    const fetchedAt = deps.now()
    await deps.store.set(rowsKey(stopId), JSON.stringify({ rows, fetchedAt }), BUS_ROWS_EXPIRE_SEC)
    return { state: "fresh", rows, fetchedAt }
  } catch (error) {
    if (isTflRateLimitError(error)) {
      await deps.store.set(backoffKey(stopId), "1", BUS_BACKOFF_SEC)
      return serveHeld("busy")
    }
    return serveHeld("failed")
  }
}

export type BusStopBoardOk = {
  ok: true
  rows: BusBoardRow[]
  updatedSecAgo: number
  stale: boolean
}
export type BusStopBoardFailed = { ok: false; kind: "busy" | "failed"; error: string }
export type BusStopBoardOutcome = BusStopBoardOk | BusStopBoardFailed

/** Rows older than this are shown as stale ("Updated Ns ago") even from a fresh cache entry. */
export const STALE_AFTER_SEC = 90

/** What the visitor sees for a snapshot: the rows, and how old they are. */
export const boardOutcome = (snapshot: BusStopSnapshot, now: number): BusStopBoardOk => {
  const ageSec = Math.max(0, Math.round((now - snapshot.fetchedAt) / 1000))
  return {
    ok: true,
    // Counted down from the read, so a row served 40 s late is not 40 s too generous.
    rows: snapshot.rows.map((row) => ({ ...row, etaSec: Math.max(0, row.etaSec - ageSec) })),
    updatedSecAgo: ageSec,
    stale: snapshot.state === "stale" || ageSec > STALE_AFTER_SEC,
  }
}

export const unavailableOutcome = (error: unknown): BusStopBoardFailed => {
  // The class may not survive the cache boundary; its message does.
  const busy =
    (error instanceof BusStopUnavailable && error.kind === "busy") ||
    (error instanceof Error && error.message === BUS_BUSY)
  const kind = busy ? "busy" : "failed"
  return { ok: false, kind, error: kind === "busy" ? BUS_BUSY : BUS_FAILED }
}

export type ServeBusBoardDeps = {
  store: QuotaStore
  /** Whether this visitor may open this stop now (their new-stops-a-minute cap). */
  admitVisitor: () => Promise<boolean>
  /** The shared per-stop cache entry. */
  snapshot: () => Promise<BusStopSnapshot>
  now: () => number
}

/**
 * The board for one visitor opening one stop. Over their own cap they still get
 * the last good rows, labelled with their age; the busy sentence is only for a
 * stop with nothing to show. Never an empty list standing in for "limited".
 */
export const serveBusStopBoard = async (
  stopId: string,
  deps: ServeBusBoardDeps
): Promise<BusStopBoardOk | BusStopBoardFailed> => {
  try {
    if (!(await deps.admitVisitor())) {
      const held = await lastGood(stopId, deps.store)
      return held
        ? boardOutcome(held, deps.now())
        : unavailableOutcome(new BusStopUnavailable("busy"))
    }
    return boardOutcome(await deps.snapshot(), deps.now())
  } catch (error) {
    return unavailableOutcome(error)
  }
}
