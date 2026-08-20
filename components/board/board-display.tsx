"use client"

import { useEffect, useMemo, useSyncExternalStore } from "react"
import { normalizeLineId } from "tfl-ts"
import { BusArrivalsBoard } from "@/components/tfl/arrivals/bus-arrivals-board"
import { RailArrivalsBoard } from "@/components/tfl/arrivals/rail-arrivals-board"
import { RiverBusArrivalsBoard } from "@/components/tfl/arrivals/river-bus-arrivals-board"
import {
  CycleHireDocksDisplay,
  CycleHireDocksDisplaySkeleton,
} from "@/components/tfl/cycle-hire/cycle-hire-docks"
import {
  TubeStatusBoard,
  TubeStatusBoardSkeleton,
} from "@/components/tfl/status/tube-status-board"
import {
  TubeStatusDisplay,
  TubeStatusDisplaySkeleton,
} from "@/components/tfl/status/tube-status-display"
import { TubeStatusStrip } from "@/components/tfl/status/tube-status-strip"
import { useBoardStatus } from "@/hooks/use-board-status"
import { useDualPathArrivals } from "@/hooks/use-dual-path-arrivals"
import { useDualPathBikePoints } from "@/hooks/use-dual-path-bike-points"
import {
  boardSlotsInclude,
  resolveBoardSlots,
  type BoardPanelKind,
} from "@/lib/tfl/board-panels"
import {
  resolveArrivalsProps,
  resolveStatusProps,
} from "@/lib/tfl/board-config-resolve"
import {
  lookupBoardArrivalsStopIds,
  type BoardArrivalsStopIdsIndex,
} from "@/lib/tfl/board-arrivals-stop-ids"
import {
  lookupBoardStationLineGroups,
  lookupBoardStationLines,
  lookupSharedTrackFamilies,
  lookupSharedTrackLineIds,
  type BoardStationLinesIndex,
} from "@/lib/tfl/board-station-lines"
import {
  lookupBoardStationName,
  resolveBoardStopNameOverride,
  type BoardStationNamesIndex,
} from "@/lib/tfl/board-station-names"
import { useUserTflCredentials } from "@/components/user-tfl-credentials-provider"
import {
  normalizeBoardHash,
  parseBoardConfig,
  type BoardConfig,
} from "@/lib/tfl/board-url-state"

/** Same bound-columns arrangement as the rail arrivals docs demo. */
const BOUND_COLUMNS_CLASS_NAMES = {
  subgroups:
    "@min-[30rem]/arrivals-group:grid-cols-2 @min-[30rem]/arrivals-group:gap-x-6",
} as const

const replaceHashIfNeeded = (nextHash: string) => {
  if (window.location.hash === nextHash) return
  const url = `${window.location.pathname}${window.location.search}${nextHash}`
  window.history.replaceState(window.history.state, "", url)
  // replaceState does not fire hashchange/popstate.
  for (const listener of boardHashListeners) listener()
}

const boardHashListeners = new Set<() => void>()

const subscribeToBoardHash = (onStoreChange: () => void) => {
  boardHashListeners.add(onStoreChange)
  window.addEventListener("hashchange", onStoreChange)
  window.addEventListener("popstate", onStoreChange)
  return () => {
    boardHashListeners.delete(onStoreChange)
    window.removeEventListener("hashchange", onStoreChange)
    window.removeEventListener("popstate", onStoreChange)
  }
}

const getBoardHash = () => window.location.hash
const getServerBoardHash = () => ""
const subscribeNoop = () => () => undefined
const getClientReady = () => true
const getServerReady = () => false

const useBoardConfigFromHash = (
  stationNames: BoardStationNamesIndex
): { config: BoardConfig; ready: boolean } => {
  const hash = useSyncExternalStore(
    subscribeToBoardHash,
    getBoardHash,
    getServerBoardHash
  )
  const ready = useSyncExternalStore(
    subscribeNoop,
    getClientReady,
    getServerReady
  )

  const config = useMemo((): BoardConfig => {
    const parsed = parseBoardConfig(hash)
    const autoName = lookupBoardStationName(stationNames, parsed.stop)
    const stopName = resolveBoardStopNameOverride(parsed.stopName, autoName)
    return { ...parsed, stopName }
  }, [hash, stationNames])

  useEffect(() => {
    // Hydration uses getServerBoardHash (""). Always rewrite from the live
    // fragment — using the render snapshot would strip #stop=…&key=….
    const liveHash = window.location.hash
    const parsed = parseBoardConfig(liveHash)
    const autoName = lookupBoardStationName(stationNames, parsed.stop)
    const stopName = resolveBoardStopNameOverride(parsed.stopName, autoName)
    replaceHashIfNeeded(normalizeBoardHash(liveHash, { stopName }))
  }, [hash, stationNames])

  return { config, ready }
}

const DEGRADED_HINT =
  "Using shared demo data. Add a TfL key on this browser, or in the Board URL hash, for live updates."

const NO_STOP_HINT =
  "Add a stop id to the URL to show live arrivals for one station."

const NO_BUS_HINT = "Add a bus stop id to the URL to show live bus arrivals."

const NO_RIVER_HINT = "Add a pier id to the URL to show live river arrivals."

const NO_CYCLE_HINT = "Add cycle dock ids to the URL to show nearby bikes."

type BoardDisplayProps = {
  /** Server-built compact stop → serving lines index. */
  stationLines: BoardStationLinesIndex
  /** Server-built compact stop → display name index. */
  stationNames: BoardStationNamesIndex
  /** Server-built stop → hub sibling ids to poll for arrivals. */
  arrivalsStopIds: BoardArrivalsStopIdsIndex
}

export const BoardDisplay = ({
  stationLines,
  stationNames,
  arrivalsStopIds,
}: BoardDisplayProps) => {
  const { config, ready } = useBoardConfigFromHash(stationNames)
  const { hydrated, getAppKey } = useUserTflCredentials()
  const storedKey = hydrated ? getAppKey() : null
  const appKey = config.key ?? storedKey

  useEffect(() => {
    if (window.self === window.top) return
    const html = document.documentElement
    const previous = html.style.overflow
    html.style.overflow = "hidden"
    return () => {
      html.style.overflow = previous
    }
  }, [])
  const stopId = config.stop ?? ""
  // URL `stopName` is an override only. Otherwise the catalog paints the
  // heading immediately; the board infers from arrivals when that misses.
  const stopName =
    config.stopName?.trim() ||
    lookupBoardStationName(stationNames, stopId) ||
    undefined

  const slots = useMemo(
    () => resolveBoardSlots(config.slots.p1, config.slots.p2),
    [config.slots.p1, config.slots.p2]
  )
  const showRail = boardSlotsInclude(slots, "rail")
  const showBus = boardSlotsInclude(slots, "bus")
  const showRiver = boardSlotsInclude(slots, "river")
  const showCycle = boardSlotsInclude(slots, "cycle")
  const showStatus = boardSlotsInclude(slots, "status")

  const status = useBoardStatus({
    appKey,
    enabled: ready && showStatus,
  })
  const pollStopIds = useMemo(
    () => lookupBoardArrivalsStopIds(arrivalsStopIds, stopId),
    [arrivalsStopIds, stopId]
  )
  const sharedTrackLineIds = useMemo(
    () => lookupSharedTrackLineIds(stopId),
    [stopId]
  )
  const sharedTrackFamilies = useMemo(
    () => lookupSharedTrackFamilies(stopId),
    [stopId]
  )
  const arrivals = useDualPathArrivals({
    stopPointId: ready && showRail ? stopId : "",
    stopPointIds: ready && showRail ? pollStopIds : [],
    appKeyOverride: ready ? appKey : null,
    sharedTrackLineIds: ready && showRail ? sharedTrackLineIds : undefined,
    sharedTrackFamilies: ready && showRail ? sharedTrackFamilies : undefined,
  })

  const busStopId = config.bus.stop ?? ""
  const riverStopId = config.river.stop ?? ""
  const cycleDockIds = config.cycle.docks ?? []

  const busArrivals = useDualPathArrivals({
    stopPointId: ready && showBus ? busStopId : "",
    appKeyOverride: ready ? appKey : null,
  })
  const riverArrivals = useDualPathArrivals({
    stopPointId: ready && showRiver ? riverStopId : "",
    appKeyOverride: ready ? appKey : null,
  })
  const cyclePoints = useDualPathBikePoints({
    dockIds: cycleDockIds,
    appKeyOverride: ready ? appKey : null,
    enabled: ready && showCycle,
  })

  const servingLines = useMemo(
    () => lookupBoardStationLines(stationLines, stopId),
    [stationLines, stopId]
  )
  const lineGroups = useMemo(
    () => lookupBoardStationLineGroups(stopId),
    [stopId]
  )
  const curatedPageSizeByLine = useMemo(() => {
    if (!lineGroups?.length) return undefined
    const map: Record<string, number> = {}
    for (const group of lineGroups) {
      if (typeof group.pageSize !== "number") continue
      for (const lineId of group.lines) {
        map[lineId] = group.pageSize
      }
    }
    return Object.keys(map).length > 0 ? map : undefined
  }, [lineGroups])

  const dataLineIds = useMemo(() => {
    const ids = new Set<string>()
    for (const row of arrivals.data) {
      if (row.lineId) ids.add(row.lineId)
    }
    return [...ids]
  }, [arrivals.data])

  const arrivalsProps = useMemo(
    () => resolveArrivalsProps(config, servingLines, dataLineIds, lineGroups),
    [config, servingLines, dataLineIds, lineGroups]
  )
  const statusProps = useMemo(() => resolveStatusProps(config), [config])
  const unattended = config.behaviour === "unattended"
  const pageSizeByLine = useMemo(() => {
    // A scalar `a.rows` broadcasts to every section — do not keep the
    // curated merge default (6) on top of that.
    if (arrivalsProps.pageSize !== undefined) {
      return arrivalsProps.pageSizeByLine
    }
    if (!curatedPageSizeByLine && !arrivalsProps.pageSizeByLine) {
      return undefined
    }
    return {
      ...curatedPageSizeByLine,
      ...arrivalsProps.pageSizeByLine,
    }
  }, [
    curatedPageSizeByLine,
    arrivalsProps.pageSize,
    arrivalsProps.pageSizeByLine,
  ])

  const statusHint =
    ready &&
    !appKey &&
    (status.source === "site" || cyclePoints.source === "site")
      ? DEGRADED_HINT
      : null
  const arrivalsError = !ready
    ? null
    : !stopId
      ? NO_STOP_HINT
      : arrivals.fetchError
  const busError = !ready
    ? null
    : !busStopId
      ? NO_BUS_HINT
      : busArrivals.fetchError
  const riverError = !ready
    ? null
    : !riverStopId
      ? NO_RIVER_HINT
      : riverArrivals.fetchError
  const cycleError = !ready
    ? null
    : cycleDockIds.length === 0
      ? NO_CYCLE_HINT
      : cyclePoints.fetchError

  const railData = useMemo(() => {
    if (!config.arrivals.lineOrder?.length) return arrivals.data
    const keep = new Set(
      (arrivalsProps.lines ?? []).map((line) => normalizeLineId(line.lineId))
    )
    for (const id of arrivalsProps.lineOrder ?? []) {
      keep.add(normalizeLineId(id))
    }
    return arrivals.data.filter((row) =>
      keep.has(normalizeLineId(row.lineId ?? ""))
    )
  }, [
    arrivals.data,
    arrivalsProps.lineOrder,
    arrivalsProps.lines,
    config.arrivals.lineOrder,
  ])

  const busData = useMemo(() => {
    const routes = config.bus.routes
    if (!routes?.length) return busArrivals.data
    const keep = new Set(routes.map((id) => id.toLowerCase()))
    return busArrivals.data.filter((row) => {
      const id = (row.lineId ?? "").toLowerCase()
      const name = (row.lineName ?? "").toLowerCase()
      return keep.has(id) || keep.has(name)
    })
  }, [busArrivals.data, config.bus.routes])

  const statusData = useMemo(() => {
    const lines = config.status.lines
    if (!lines?.length) return status.data
    const keep = new Set(lines.map((id) => normalizeLineId(id)))
    return status.data.filter((line) =>
      keep.has(normalizeLineId(line.id ?? ""))
    )
  }, [status.data, config.status.lines])

  const twoColumns = slots.p1.length > 0 && slots.p2.length > 0

  const renderPanel = (kind: BoardPanelKind) => {
    if (kind === "rail") {
      return (
        <RailArrivalsBoard
          stopName={stopName}
          stopPointId={stopId || undefined}
          headingLevel={2}
          data={railData}
          now={arrivals.fetchedAt ?? undefined}
          lines={arrivalsProps.lines}
          lineGroups={lineGroups}
          lineOrder={arrivalsProps.lineOrder}
          pageSize={arrivalsProps.pageSize}
          pageSizeByLine={pageSizeByLine}
          behaviour={config.behaviour}
          pinFirst={arrivalsProps.pinFirst}
          startDelayMs={unattended ? 0 : undefined}
          loading={arrivals.loading}
          error={arrivalsError}
          classNames={BOUND_COLUMNS_CLASS_NAMES}
        />
      )
    }
    if (kind === "bus") {
      return (
        <BusArrivalsBoard
          stopName={busArrivals.data[0]?.stationName ?? "Bus"}
          stopPointId={busStopId || undefined}
          headingLevel={2}
          data={busData}
          now={busArrivals.fetchedAt ?? undefined}
          groupBy={config.bus.routes?.length ? "none" : "route"}
          pageSize={config.bus.rows}
          behaviour={config.behaviour}
          pinFirst={arrivalsProps.pinFirst}
          startDelayMs={unattended ? 400 : undefined}
          loading={busArrivals.loading}
          error={busError}
        />
      )
    }
    if (kind === "river") {
      return (
        <RiverBusArrivalsBoard
          stopName={riverArrivals.data[0]?.stationName ?? "River"}
          stopPointId={riverStopId || undefined}
          headingLevel={2}
          data={riverArrivals.data}
          now={riverArrivals.fetchedAt ?? undefined}
          groupBy="route"
          pageSize={config.river.rows}
          behaviour={config.behaviour}
          pinFirst={arrivalsProps.pinFirst}
          startDelayMs={unattended ? 800 : undefined}
          loading={riverArrivals.loading}
          error={riverError}
        />
      )
    }
    if (kind === "cycle") {
      if (
        !ready ||
        (cyclePoints.loading && cyclePoints.data.length === 0 && !cycleError)
      ) {
        return <CycleHireDocksDisplaySkeleton tiles={config.cycle.tiles ?? 2} />
      }
      return (
        <CycleHireDocksDisplay
          data={cyclePoints.data}
          tiles={config.cycle.tiles}
          behaviour={config.behaviour}
          startDelayMs={unattended ? 1200 : undefined}
          error={cycleError}
        />
      )
    }

    if (
      !ready ||
      (status.loading && status.data.length === 0 && !status.error)
    ) {
      return unattended ? (
        <TubeStatusDisplaySkeleton tiles={statusProps.tiles} />
      ) : (
        <TubeStatusBoardSkeleton />
      )
    }
    if (unattended && statusProps.surface === "strip") {
      return (
        <TubeStatusStrip
          data={statusData}
          now={status.fetchedAt ?? undefined}
          units={statusProps.tiles}
          detailScope={statusProps.detailScope}
          detailLineIds={statusProps.detailLineIds}
          dwellMs={statusProps.dwellMs}
          startDelayMs={1500}
          error={status.error}
        />
      )
    }
    if (unattended) {
      return (
        <TubeStatusDisplay
          data={statusData}
          now={status.fetchedAt ?? undefined}
          tiles={statusProps.tiles}
          detailScope={statusProps.detailScope}
          detailLineIds={statusProps.detailLineIds}
          dwellMs={statusProps.dwellMs}
          startDelayMs={1500}
          error={status.error}
        />
      )
    }
    return (
      <TubeStatusBoard
        data={statusData}
        now={status.fetchedAt ?? undefined}
        hideHeader
      />
    )
  }

  const renderStack = (
    kinds: readonly BoardPanelKind[],
    label: string,
    wide: boolean
  ) => {
    if (kinds.length === 0) return null
    return (
      <section
        className={wide && twoColumns ? "min-w-0 md:col-span-2" : "min-w-0"}
        aria-label={label}
      >
        <div className="grid gap-8">
          {kinds.map((kind) => (
            <div key={kind}>{renderPanel(kind)}</div>
          ))}
        </div>
      </section>
    )
  }

  return (
    <div className="box-border min-h-dvh w-full p-4 md:p-6">
      <h1 className="sr-only">Live board</h1>
      <div
        className={
          twoColumns
            ? "grid grid-cols-1 items-start gap-8 md:grid-cols-3 md:gap-x-6"
            : "grid grid-cols-1 items-start gap-8"
        }
      >
        {renderStack(slots.p1, "Wide slot", true)}
        {renderStack(slots.p2, "Narrow slot", false)}
      </div>
      {showStatus && status.error ? (
        <p className="mt-3 text-sm text-muted-foreground">{status.error}</p>
      ) : null}
      {statusHint ? (
        <p className="mt-3 text-sm text-muted-foreground">{statusHint}</p>
      ) : null}
    </div>
  )
}
