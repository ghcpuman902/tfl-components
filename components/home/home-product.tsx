"use client"

import { useEffect, useMemo, useState } from "react"
import dynamic from "next/dynamic"
import { BusBoardView, StationBoardView } from "@/components/home/board-view"
import { PlaceSearch } from "@/components/home/place-search"
import { useHomeLive } from "@/components/home/use-home-live"
import type { ExplorerTubeRailPoint } from "@/lib/tfl/explorer/common"
import {
  getBusStopBoardAction,
  getBusStopOverlayAction,
  getBusVehiclesAction,
  type BusBoardRow,
  type MapBus,
  type BusStopOverlay,
} from "@/lib/tfl/homepage-live/actions"
import {
  REPLAY_FIXTURES,
  type ReplayRequest,
} from "@/lib/tfl/homepage-live/replay-params"
import { stationHitOf, type PlaceHit } from "@/lib/tfl/homepage-live/search"
import {
  buildStationBoard,
  busesDueWithin,
  trainsAroundStation,
} from "@/lib/tfl/homepage-live/station-board"
import { cn } from "@/lib/utils"

/** The map pulls in MapLibre and the track geometry; the Board and search paint first. */
const HomeMap = dynamic(
  () => import("@/components/home/home-map").then((m) => m.HomeMap),
  {
    ssr: false,
    loading: () => <div className="size-full animate-pulse bg-muted/40" aria-hidden />,
  }
)

const MAP_FRAME =
  "h-[70svh] min-h-96 w-full lg:h-[calc(100svh-15rem)] lg:min-h-[32rem]"

type Loadable<T> =
  | { status: "loading" }
  | { status: "ok"; value: T }
  | { status: "error"; message: string }

const FETCH_TIMEOUT_MS = 8_000
const BUS_POLL_MS = 20_000
const BUS_GPS_POLL_MS = 15_000
const BUS_ARRIVALS_FAILED = "Bus arrivals are unavailable right now."

type BusRowsValue = { rows: BusBoardRow[]; updatedSecAgo?: number }

const raceTimeout = <T,>(promise: Promise<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), FETCH_TIMEOUT_MS)
    promise.then(
      (v) => {
        clearTimeout(timer)
        resolve(v)
      },
      (e: unknown) => {
        clearTimeout(timer)
        reject(e)
      }
    )
  })

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
  const fallback = stations.find((s) => s.id === defaultStationId) ?? stations[0]!
  const [selection, setSelection] = useState<PlaceHit>(() => stationHitOf(fallback))
  const [preview, setPreview] = useState<PlaceHit | null>(null)
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const live = useHomeLive(replay)
  const replayArg = replay && { fixture: replay.fixture, round: replay.round }

  // Results are tagged with the stop they belong to, so a previous stop's rows never sit under a new title.
  const [overlayFor, setOverlayFor] = useState<{ id: string; state: Loadable<BusStopOverlay> } | null>(null)
  const [rowsFor, setRowsFor] = useState<{ id: string; state: Loadable<BusRowsValue> } | null>(null)
  const busId = selection.kind === "bus" ? selection.id : undefined
  const overlay: Loadable<BusStopOverlay> =
    overlayFor && overlayFor.id === busId ? overlayFor.state : { status: "loading" }
  const busRows: Loadable<BusRowsValue> =
    rowsFor && rowsFor.id === busId ? rowsFor.state : { status: "loading" }

  useEffect(() => {
    if (!busId) return
    let alive = true
    raceTimeout(getBusStopOverlayAction(busId, replayArg))
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
            state: { status: "error", message: "That stop could not be loaded right now." },
          })
      })
    return () => {
      alive = false
    }
    // The replay request is stable for the page's life.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busId])

  // Bus times follow the shared 20 s cache; a failed refresh keeps the rows already shown.
  useEffect(() => {
    if (!busId) return
    let alive = true
    const load = () =>
      raceTimeout(getBusStopBoardAction(busId, replayArg))
        .then((result) => {
          if (!alive) return
          if (result.ok) {
            setRowsFor({
              id: busId,
              state: {
                status: "ok",
                value: {
                  rows: result.rows,
                  updatedSecAgo: result.stale ? result.updatedSecAgo : undefined,
                },
              },
            })
            return
          }
          setRowsFor((held) =>
            held?.id === busId && held.state.status === "ok"
              ? held
              : { id: busId, state: { status: "error", message: result.error } }
          )
        })
        .catch(() => {
          if (!alive) return
          setRowsFor((held) =>
            held?.id === busId && held.state.status === "ok"
              ? held
              : { id: busId, state: { status: "error", message: BUS_ARRIVALS_FAILED } }
          )
        })
    void load()
    const timer = replay ? undefined : setInterval(load, BUS_POLL_MS)
    return () => {
      alive = false
      clearInterval(timer)
    }
    // The replay request is stable for the page's life.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busId])

  // GPS buses (BODS) for the stop's routes; with no key the answer is "none" and nothing is drawn.
  const [busesFor, setBusesFor] = useState<{ id: string; buses: MapBus[]; gps: boolean } | null>(null)
  const overlayStop = overlay.status === "ok" ? overlay.value.stop : undefined
  const overlayRouteKey =
    overlay.status === "ok" ? overlay.value.routes.map((r) => r.routeId).join(",") : ""
  const stopLat = overlayStop?.lat
  const stopLon = overlayStop?.lon
  useEffect(() => {
    if (!busId || !overlayRouteKey || stopLat == null || stopLon == null) return
    let alive = true
    const load = () =>
      raceTimeout(
        getBusVehiclesAction(overlayRouteKey.split(","), { lat: stopLat, lon: stopLon }, replayArg)
      )
        .then((result) => {
          if (!alive) return
          if (result.ok) setBusesFor({ id: busId, buses: result.buses, gps: result.source === "gps" })
          // A failed refresh keeps the buses already drawn.
        })
        .catch(() => undefined)
    void load()
    const timer = replay ? undefined : setInterval(load, BUS_GPS_POLL_MS)
    return () => {
      alive = false
      clearInterval(timer)
    }
    // The replay request is stable for the page's life.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busId, overlayRouteKey, stopLat, stopLon])
  const mapBuses = busesFor && busesFor.id === busId ? busesFor : undefined

  const station = selection.kind === "station" ? selection : undefined
  const frame = live.frame
  const sections = useMemo(
    () =>
      frame && station
        ? buildStationBoard({
            rows: frame.rows,
            trains: frame.snapshot.trains,
            stopIds: station.stopIds,
            receivedAt: frame.receivedAt,
            lineOrder: station.lines,
          })
        : [],
    [frame, station]
  )
  const around = useMemo(
    () =>
      frame && station
        ? trainsAroundStation({
            rows: frame.rows,
            trains: frame.snapshot.trains,
            stopIds: station.stopIds,
            receivedAt: frame.receivedAt,
          })
        : [],
    [frame, station]
  )

  const busOverlay = overlay.status === "ok" ? overlay.value : undefined
  const busHit = busOverlay?.stop ?? (selection.kind === "bus" ? selection : undefined)
  const label =
    selection.kind === "bus"
      ? `${selection.name}${(busHit?.stopLetter ?? selection.stopLetter) ? ` · Stop ${busHit?.stopLetter ?? selection.stopLetter}` : ""}`
      : selection.name
  const previewPoint =
    preview?.lat != null && preview.lon != null
      ? { lat: preview.lat, lon: preview.lon }
      : null

  const select = (hit: PlaceHit) => {
    setSelection(hit)
    setSelectedKey(null)
    setActiveKey(null)
  }

  return (
    <div className="mx-auto w-full max-w-[96rem] px-4 pt-4 pb-10 sm:px-8">
      <h1 className="sr-only">Live Tube, rail and bus arrivals for London</h1>
      <PlaceSearch
        stations={stations}
        hubStationIds={hubStationIds}
        valueLabel={label}
        anchor={station ?? busHit}
        replay={replayArg}
        searchDelayMs={replay?.searchDelayMs}
        onSelect={select}
        onPreview={setPreview}
      />
      <p className="pt-2 text-sm text-balance text-muted-foreground" aria-live="polite">
        {replay
          ? `Recorded frame: ${REPLAY_FIXTURES[replay.fixture]}, ${replay.round * 30} s in.`
          : live.status === "error" && live.error
            ? live.error
            : "Live from TfL, about a minute behind."}
      </p>
      <div
        className={cn(
          "grid gap-6 pt-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-8"
        )}
      >
        <div className="min-w-0 lg:col-start-2 lg:row-start-1 lg:max-h-[calc(100svh-15rem)] lg:overflow-y-auto">
          {selection.kind === "station" ? (
            <StationBoardView
              title={selection.name}
              subtitle={`${selection.lines.length} ${selection.lines.length === 1 ? "line" : "lines"}`}
              sections={sections}
              status={live.status === "loading" ? "loading" : frame ? "ok" : "error"}
              error={live.error}
              activeKey={activeKey}
              selectedKey={selectedKey}
              onActive={setActiveKey}
              onSelect={(key) => setSelectedKey((prev) => (prev === key ? null : key))}
            />
          ) : (
            <BusBoardView
              title={selection.name}
              stopLetter={busHit?.stopLetter ?? selection.stopLetter}
              towards={busHit?.towards ?? selection.towards}
              routes={busHit?.routes ?? selection.routes}
              rows={busRows.status === "ok" ? busRows.value.rows : []}
              updatedSecAgo={busRows.status === "ok" ? busRows.value.updatedSecAgo : undefined}
              status={busRows.status}
              error={busRows.status === "error" ? busRows.message : undefined}
            />
          )}
        </div>
        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          <div className={MAP_FRAME}>
            <HomeMap
              className="size-full"
              trains={selection.kind === "station" ? around : []}
              station={station && station.lat != null && station.lon != null ? { lat: station.lat, lon: station.lon, name: station.name } : undefined}
              busStop={busOverlay}
              buses={mapBuses?.buses}
              preview={previewPoint}
              activeKey={activeKey}
              selectedKey={selectedKey}
              onSelectTrain={setSelectedKey}
              still={Boolean(replay)}
              subject={selection.kind}
              busesDue={busRows.status === "ok" ? busesDueWithin(busRows.value.rows) : undefined}
              caption={
                selection.kind === "bus"
                  ? overlay.status === "error"
                    ? overlay.message
                    : mapBuses?.gps
                      ? mapBuses.buses.length > 0
                        ? "Buses are drawn at their last GPS fix."
                        : "No buses with a GPS fix on these routes nearby."
                      : "Bus routes are drawn; buses themselves are not placed yet."
                  : undefined
              }
            />
          </div>
        </div>
      </div>
      <p className="pt-6 text-center text-sm text-balance text-muted-foreground">
        Independent project, not affiliated with TfL. Map © OpenStreetMap contributors. Data: TfL Unified API.
      </p>
    </div>
  )
}
