"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { BusBoardView, StationBoardView } from "@/components/home/board-view"
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
  isStale,
  liveStatusLine,
} from "@/lib/tfl/homepage-live/data-age"
import { stationHitOf, type PlaceHit } from "@/lib/tfl/homepage-live/search"
import { buildStationBoard } from "@/lib/tfl/homepage-live/station-board"
import { BOARD_PATH, boardHashFromConfig } from "@/lib/tfl/board-url-state"
import { TEXT_LINK_CLASS } from "@/lib/text-link"
import { cn } from "@/lib/utils"

type Loadable<T> =
  | { status: "loading" }
  | { status: "ok"; value: T }
  | { status: "error"; message: string }

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
  defaultStationId: string
  replay?: ReplayRequest
}

export const HomeProduct = ({
  stations,
  hubStationIds,
  defaultStationId,
  replay,
}: HomeProductProps) => {
  const fallback =
    stations.find((s) => s.id === defaultStationId) ?? stations[0]!
  const [selection, setSelection] = useState<PlaceHit>(() =>
    stationHitOf(fallback)
  )
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
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
  const sections = useMemo(
    () =>
      frame && station
        ? buildStationBoard({
            rows: frame.rows,
            trains: frame.snapshot.trains,
            stopIds: station.stopIds,
            receivedAt: frame.receivedAt,
            ageSec,
            lineOrder: station.lines,
          })
        : [],
    [frame, station, ageSec]
  )
  const busOverlay = overlay.status === "ok" ? overlay.value : undefined
  const busHit =
    busOverlay?.stop ?? (selection.kind === "bus" ? selection : undefined)
  const label =
    selection.kind === "bus"
      ? `${selection.name}${(busHit?.stopLetter ?? selection.stopLetter) ? ` · Stop ${busHit?.stopLetter ?? selection.stopLetter}` : ""}`
      : selection.name
  const select = (hit: PlaceHit) => {
    setSelection(hit)
    setSelectedKey(null)
    setActiveKey(null)
  }

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
      <div className="min-w-0 pt-6">
        {selection.kind === "station" ? (
          <StationBoardView
            title={selection.name}
            subtitle={`${selection.lines.length} ${selection.lines.length === 1 ? "line" : "lines"}`}
            sections={sections}
            status={
              live.status === "loading" ? "loading" : frame ? "ok" : "error"
            }
            error={live.error}
            stale={isStale(live.ageSec)}
            activeKey={activeKey}
            selectedKey={selectedKey}
            onActive={setActiveKey}
            onSelect={(key) =>
              setSelectedKey((prev) => (prev === key ? null : key))
            }
          />
        ) : (
          <BusBoardView
            title={selection.name}
            stopLetter={busHit?.stopLetter ?? selection.stopLetter}
            towards={busHit?.towards ?? selection.towards}
            // The search hit carries the stop's own routes; TfL's stop detail can list its whole hub's.
            routes={selection.routes.length > 0 ? selection.routes : (busHit?.routes ?? [])}
            rows={busRowsShown}
            updatedSecAgo={busStaleAge}
            status={busRows.status}
            error={busRows.status === "error" ? busRows.message : undefined}
          />
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
