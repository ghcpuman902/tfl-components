"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ARRIVALS_RHYTHM_VARS } from "@/components/tfl/arrivals/arrivals-board-view"
import { BusArrivalsBoard } from "@/components/tfl/arrivals/bus-arrivals-board"
import { RailArrivalsBoard } from "@/components/tfl/arrivals/rail-arrivals-board"
import { PlaceSearch } from "@/components/home/place-search"
import { useHomeLive } from "@/components/home/use-home-live"
import type { ExplorerTubeRailPoint } from "@/lib/tfl/explorer/common"
import {
  getBusStopBoardAction,
  getBusStopOverlayAction,
  type BusBoardRow,
  type BusStopOverlay,
} from "@/lib/tfl/homepage-live/actions"
import {
  busReadPlan,
  FIRST_READ_TIMEOUT_MS,
  keepHeldOnFailure,
  readWithRetry,
  withTimeout,
} from "@/lib/tfl/homepage-live/bus-board-read"
import {
  REPLAY_FIXTURES,
  type ReplayRequest,
} from "@/lib/tfl/homepage-live/replay-params"
import {
  countDownRows,
  elapsedSec,
  formatUpdatedAgo,
  isStale,
  liveStatusLine,
} from "@/lib/tfl/homepage-live/data-age"
import {
  busArrivalsFromRows,
  homepageServingLines,
  stationArrivalsFromSnapshot,
} from "@/lib/tfl/homepage-live/board-arrivals"
import { stationHitOf, type PlaceHit } from "@/lib/tfl/homepage-live/search"
import {
  arrivalsLineEmptyCopy,
  resolveArrivalsEmptyKind,
} from "@/lib/tfl/arrivals-empty"
import {
  lookupBoardStationLineGroups,
  lookupBoardStationLines,
  type BoardStationLinesIndex,
} from "@/lib/tfl/board-station-lines"
import { BOARD_PATH, boardHashFromConfig } from "@/lib/tfl/board-url-state"
import { TEXT_LINK_CLASS } from "@/lib/text-link"
import { cn } from "@/lib/utils"

type Loadable<T> =
  | { status: "loading" }
  | { status: "ok"; value: T }
  | { status: "error"; message: string }

/** Same bound-columns arrangement as the live Board's rail panel (components/board/board-display.tsx). */
const BOUND_COLUMNS_CLASS_NAMES = {
  subgroups:
    "@min-[30rem]/arrivals-group:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] @min-[30rem]/arrivals-group:gap-x-6",
} as const

const BUS_POLL_MS = 20_000
const BUS_ARRIVALS_FAILED = "Bus arrivals are unavailable right now."

/** Rows as the server gave them: their age then (undefined for a recording), the server's own stale flag, and when they arrived on this clock. */
type BusRowsValue = {
  rows: BusBoardRow[]
  ageAtApplySec?: number
  stale: boolean
  appliedAt: number
}

export type HomeProductProps = {
  stations: readonly ExplorerTubeRailPoint[]
  hubStationIds: Readonly<Record<string, string>>
  /** The live Board's serving-lines index (same one /board passes to BoardDisplay). */
  stationLines: BoardStationLinesIndex
  defaultStationId: string
  replay?: ReplayRequest
}

export const HomeProduct = ({
  stations,
  hubStationIds,
  stationLines,
  defaultStationId,
  replay,
}: HomeProductProps) => {
  const fallback =
    stations.find((s) => s.id === defaultStationId) ?? stations[0]!
  const [selection, setSelection] = useState<PlaceHit>(() =>
    stationHitOf(fallback)
  )
  const live = useHomeLive(replay)
  const replayArg = replay && { fixture: replay.fixture, round: replay.round }

  // Results are tagged with the stop they belong to, so a previous stop's rows never sit under a new title.
  const [overlayFor, setOverlayFor] = useState<{
    id: string
    state: Loadable<BusStopOverlay>
  } | null>(null)
  const [rowsFor, setRowsFor] = useState<{
    id: string
    state: Loadable<BusRowsValue>
  } | null>(null)
  const busId = selection.kind === "bus" ? selection.id : undefined
  const overlay: Loadable<BusStopOverlay> =
    overlayFor && overlayFor.id === busId
      ? overlayFor.state
      : { status: "loading" }
  const busRows: Loadable<BusRowsValue> =
    rowsFor && rowsFor.id === busId ? rowsFor.state : { status: "loading" }

  // Bus times follow the shared 20 s cache; a failed refresh keeps the rows already shown.
  // Until this stop has rows, a read waits longer and a timeout is retried once (a cold
  // server's first TfL read is slow), so only a real failure shows "unavailable".
  // Declared before the overlay effect: Next runs server actions one at a time, so the
  // arrivals read is sent first.
  useEffect(() => {
    if (!busId) return
    let alive = true
    let holdsRows = false
    let inFlight = false
    const load = () => {
      // A slow first read (with its retry) can outlast the poll interval; never stack reads.
      if (inFlight) return
      inFlight = true
      void readWithRetry(
        () => getBusStopBoardAction(busId, replayArg),
        busReadPlan(holdsRows)
      )
        .then((result) => {
          if (!alive) return
          if (result.ok) {
            holdsRows = true
            setRowsFor({
              id: busId,
              state: {
                status: "ok",
                value: {
                  rows: result.rows,
                  ageAtApplySec: result.updatedSecAgo,
                  stale: Boolean(result.stale),
                  appliedAt: Date.now(),
                },
              },
            })
            return
          }
          setRowsFor((held) =>
            keepHeldOnFailure(held, busId, {
              id: busId,
              state: { status: "error", message: result.error },
            })
          )
        })
        .catch(() => {
          if (!alive) return
          setRowsFor((held) =>
            keepHeldOnFailure(held, busId, {
              id: busId,
              state: { status: "error", message: BUS_ARRIVALS_FAILED },
            })
          )
        })
        .finally(() => {
          inFlight = false
        })
    }
    load()
    const timer = replay ? undefined : setInterval(load, BUS_POLL_MS)
    return () => {
      alive = false
      clearInterval(timer)
    }
    // The replay request is stable for the page's life.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busId])

  useEffect(() => {
    if (!busId) return
    let alive = true
    withTimeout(getBusStopOverlayAction(busId, replayArg), FIRST_READ_TIMEOUT_MS)
      .then((result) => {
        if (!alive) return
        setOverlayFor({
          id: busId,
          state: result.ok
            ? { status: "ok", value: result.overlay }
            : { status: "error", message: result.error },
        })
      })
      .catch(() => {
        if (alive)
          setOverlayFor({
            id: busId,
            state: {
              status: "error",
              message: "That stop could not be loaded right now.",
            },
          })
      })
    return () => {
      alive = false
    }
    // The replay request is stable for the page's life.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busId])

  // Countdowns run from the TfL read, not from when this page applied it, and keep running between polls.
  const busRowsAge =
    busRows.status === "ok" && busRows.value.ageAtApplySec != null
      ? busRows.value.ageAtApplySec +
        elapsedSec(busRows.value.appliedAt, live.now)
      : undefined
  const busRowsShown =
    busRows.status === "ok"
      ? countDownRows(
          busRows.value.rows,
          busRows.value.ageAtApplySec != null
            ? elapsedSec(busRows.value.appliedAt, live.now)
            : 0
        )
      : []
  const busStaleAge =
    busRows.status === "ok" &&
    busRowsAge != null &&
    (busRows.value.stale || isStale(busRowsAge))
      ? Math.round(busRowsAge)
      : undefined

  const station = selection.kind === "station" ? selection : undefined
  const frame = live.frame
  const ageSec = live.ageSec ?? 0
  // The live Board's rail panel, fed from the shared network poll (see lib/tfl/homepage-live/board-arrivals.ts).
  const stationId = station?.id
  const railData = useMemo(
    () =>
      frame && station
        ? stationArrivalsFromSnapshot({
            rows: frame.rows,
            stopIds: station.stopIds,
            receivedAt: frame.receivedAt,
            ageSec,
            stationName: station.name,
          })
        : [],
    [frame, station, ageSec]
  )
  const servingLines = useMemo(
    () => homepageServingLines(lookupBoardStationLines(stationLines, stationId)),
    [stationLines, stationId]
  )
  const lineGroups = useMemo(
    () => lookupBoardStationLineGroups(stationId),
    [stationId]
  )
  // As the Board does: curated groups may set rows per bound for their lines.
  const pageSizeByLine = useMemo(() => {
    const map: Record<string, number> = {}
    for (const group of lineGroups ?? []) {
      if (typeof group.pageSize !== "number") continue
      for (const lineId of group.lines) map[lineId] = group.pageSize
    }
    return Object.keys(map).length > 0 ? map : undefined
  }, [lineGroups])
  const railNow = frame ? frame.receivedAt + ageSec * 1000 : undefined
  const railError = !frame && live.status === "error" ? (live.error ?? null) : null
  const railEmpty = useMemo(
    () =>
      railNow == null
        ? { kind: "empty" as const }
        : (resolveArrivalsEmptyKind({
            rowCount: railData.length,
            domain: "rail",
            nowMs: railNow,
            lineIds: servingLines?.map((line) => line.lineId),
            stopPointId: stationId,
          }) ?? { kind: "empty" as const }),
    [railData.length, railNow, servingLines, stationId]
  )
  const busOverlay = overlay.status === "ok" ? overlay.value : undefined
  const busHit =
    busOverlay?.stop ?? (selection.kind === "bus" ? selection : undefined)
  const label =
    selection.kind === "bus"
      ? `${selection.name}${(busHit?.stopLetter ?? selection.stopLetter) ? ` · Stop ${busHit?.stopLetter ?? selection.stopLetter}` : ""}`
      : selection.name
  const select = (hit: PlaceHit) => setSelection(hit)
  const busStopLetter = busHit?.stopLetter ?? (selection.kind === "bus" ? selection.stopLetter : undefined)
  // The live Board's bus panel, fed from the homepage's bus read (quota and stale handling stay as they are).
  const busData =
    selection.kind === "bus" && busRows.status === "ok"
      ? busArrivalsFromRows({
          rows: busRowsShown,
          stopId: selection.id,
          stopName: selection.name,
          stopLetter: busStopLetter,
          at: Math.max(busRows.value.appliedAt, live.now),
        })
      : []

  const customiseHref = `${BOARD_PATH}${boardHashFromConfig(
    selection.kind === "station"
      ? { stop: selection.id, stopName: selection.name }
      : { bus: { stop: selection.id }, slots: { p1: ["bus"], p2: [] } }
  )}`

  // Phone and desktop share one column: search on top, the Board below it. Flat: no borders or shadows.
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-6 pb-10 sm:px-8 lg:pt-10">
      <h1 className="sr-only">Live Tube, rail and bus arrivals for London</h1>
      <PlaceSearch
        stations={stations}
        hubStationIds={hubStationIds}
        valueLabel={label}
        anchor={station ?? busHit}
        replay={replayArg}
        searchDelayMs={replay?.searchDelayMs}
        onSelect={select}
      />
      <p
        className="pt-2 text-sm text-balance text-muted-foreground"
        aria-live="polite"
      >
        {replay
          ? `Recorded frame: ${REPLAY_FIXTURES[replay.fixture]}, ${replay.round * 30} s in.`
          : liveStatusLine({
              error: live.status === "error" ? live.error : undefined,
              ageSec: live.ageSec,
            })}
      </p>
      {/* Same shell as the Board: the container its arrivals panels query, and its row rhythm. */}
      <div className="@container/board min-w-0 pt-6" style={ARRIVALS_RHYTHM_VARS}>
        {selection.kind === "station" ? (
          // An old poll keeps its times, dimmed; the line under the search says how old.
          <div className={cn(isStale(live.ageSec) && "opacity-60")} data-stale={isStale(live.ageSec) || undefined}>
            <RailArrivalsBoard
              stopName={selection.name}
              stopPointId={selection.id}
              headingLevel={2}
              data={railData}
              now={railNow}
              lines={servingLines}
              lineGroups={lineGroups}
              pageSizeByLine={pageSizeByLine}
              loading={live.status === "loading"}
              error={railError}
              emptyKind={railEmpty.kind}
              emptyMessage={arrivalsLineEmptyCopy(railEmpty)}
              classNames={BOUND_COLUMNS_CLASS_NAMES}
            />
          </div>
        ) : (
          <>
            {busStaleAge != null ? (
              <p role="status" className="pb-2 text-sm text-muted-foreground">
                {formatUpdatedAgo(busStaleAge)}
                {busRowsShown.length === 0 ? " Refreshing." : ""}
              </p>
            ) : null}
            <BusArrivalsBoard
              stopName={selection.name}
              stopPointId={selection.id}
              stopLetter={busStopLetter}
              headingLevel={2}
              data={busData}
              groupBy="route"
              loading={busRows.status === "loading"}
              error={busRows.status === "error" ? busRows.message : null}
            />
          </>
        )}
      </div>
      <p className="pt-6 text-sm">
        <Link
          href={customiseHref}
          className={cn(TEXT_LINK_CLASS, "font-medium text-foreground")}
        >
          Customise this Board
        </Link>
      </p>
      <p className="pt-6 text-center text-sm text-balance text-muted-foreground">
        Independent project, not affiliated with TfL. Data: TfL Unified API.
      </p>
    </div>
  )
}
