"use client"

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react"
import dynamic from "next/dynamic"
import { normalizeLineId } from "tfl-ts"
import { ARRIVALS_RHYTHM_VARS } from "@/components/tfl/arrivals/arrivals-board-view"
import { BoardViewFooter } from "@/components/board/board-view-footer"
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
import { STATUS_POLL_MS, useBoardStatus } from "@/hooks/use-board-status"
import {
  ARRIVALS_POLL_MS,
  useDualPathArrivals,
} from "@/hooks/use-dual-path-arrivals"
import {
  BIKE_POLL_MS,
  useDualPathBikePoints,
} from "@/hooks/use-dual-path-bike-points"
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
import { BOARD_SETTINGS } from "@/lib/tfl/board-settings"
import {
  BOARD_PATH,
  normalizeBoardHash,
  parseBoardConfig,
  type BoardConfig,
} from "@/lib/tfl/board-url-state"

const CycleHireDocksMap = dynamic(
  () =>
    import("@/components/tfl/cycle-hire/cycle-hire-docks").then(
      (mod) => mod.CycleHireDocksMap
    ),
  { ssr: false }
)

/** Same bound-columns arrangement as the rail arrivals docs demo. */
const BOUND_COLUMNS_CLASS_NAMES = {
  subgroups:
    "@min-[30rem]/arrivals-group:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] @min-[30rem]/arrivals-group:gap-x-6",
} as const

/** Half-tile — `gap-8` (32px) is off the 24px baseline. */
const BOARD_RHYTHM_GAP_CLASS = "gap-y-[calc(var(--arrivals-row)/2)]"

const CycleHireMapSkeleton = ({ tiles }: { tiles: number }) => (
  <div
    className="w-full animate-pulse bg-muted"
    style={{
      ...ARRIVALS_RHYTHM_VARS,
      height: `calc(var(--arrivals-row) * ${tiles})`,
    }}
    aria-busy
    aria-label="Loading cycle hire map"
  />
)

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
const getEmbedded = () =>
  window.self !== window.top ||
  new URLSearchParams(window.location.search).get("embed") === "1"
const getServerEmbedded = () => false

const useBoardConfigFromHash = (
  stationNames: BoardStationNamesIndex
): { config: BoardConfig; ready: boolean; configEpoch: string } => {
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

  return { config, ready, configEpoch: hash }
}

const DEGRADED_HINT =
  "Using shared demo data. Add a TfL key on this browser, or in the Board URL hash, for live updates."

const NO_STOP_HINT =
  "Add a stop id to the URL to show live arrivals for one station."

const NO_BUS_HINT = "Choose a bus stop to show live bus arrivals."

const NO_RIVER_HINT = "Choose a pier to show live river arrivals."

const NO_CYCLE_HINT = "Choose cycle docks to show nearby bikes."

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
  const { config, ready, configEpoch } = useBoardConfigFromHash(stationNames)
  const { hydrated, getAppKey } = useUserTflCredentials()
  const storedKey = hydrated ? getAppKey() : null
  const appKey = config.key ?? storedKey
  const embedded = useSyncExternalStore(
    subscribeNoop,
    getEmbedded,
    getServerEmbedded
  )

  useEffect(() => {
    if (!embedded) return
    const html = document.documentElement
    const previous = html.style.overflow
    html.style.overflow = "hidden"
    html.classList.add("board-embed")
    return () => {
      html.style.overflow = previous
      html.classList.remove("board-embed")
    }
  }, [embedded])

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

  const handleRefresh = useCallback(() => {
    if (showRail) arrivals.refresh()
    if (showBus) busArrivals.refresh()
    if (showRiver) riverArrivals.refresh()
    if (showCycle) cyclePoints.refresh()
    if (showStatus) status.refresh()
  }, [
    arrivals.refresh,
    busArrivals.refresh,
    cyclePoints.refresh,
    riverArrivals.refresh,
    showBus,
    showCycle,
    showRail,
    showRiver,
    showStatus,
    status.refresh,
  ])

  const pollSources = useMemo(
    () => [
      {
        fetchedAt: arrivals.fetchedAt,
        pollMs: ARRIVALS_POLL_MS,
        enabled: ready && showRail,
      },
      {
        fetchedAt: busArrivals.fetchedAt,
        pollMs: ARRIVALS_POLL_MS,
        enabled: ready && showBus,
      },
      {
        fetchedAt: riverArrivals.fetchedAt,
        pollMs: ARRIVALS_POLL_MS,
        enabled: ready && showRiver,
      },
      {
        fetchedAt: cyclePoints.fetchedAt,
        pollMs: BIKE_POLL_MS,
        enabled: ready && showCycle,
      },
      {
        fetchedAt: status.fetchedAt,
        pollMs: STATUS_POLL_MS,
        enabled: ready && showStatus,
        polls: status.source === "user",
      },
    ],
    [
      arrivals.fetchedAt,
      busArrivals.fetchedAt,
      cyclePoints.fetchedAt,
      ready,
      riverArrivals.fetchedAt,
      showBus,
      showCycle,
      showRail,
      showRiver,
      showStatus,
      status.fetchedAt,
      status.source,
    ]
  )

  const refreshing =
    (showRail && arrivals.loading) ||
    (showBus && busArrivals.loading) ||
    (showRiver && riverArrivals.loading) ||
    (showCycle && cyclePoints.loading) ||
    (showStatus && status.loading)

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
  const statusProps = useMemo(
    () =>
      resolveStatusProps(
        config,
        servingLines?.map((line) => line.lineId)
      ),
    [config, servingLines]
  )
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
    if (!lines?.length || config.status.overview !== "selection") {
      return status.data
    }
    const keep = new Set(lines.map((id) => normalizeLineId(id)))
    return status.data.filter((line) =>
      keep.has(normalizeLineId(line.id ?? ""))
    )
  }, [status.data, config.status.lines, config.status.overview])

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
          loading={!ready || arrivals.loading}
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
          loading={!ready || busArrivals.loading}
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
          loading={!ready || riverArrivals.loading}
          error={riverError}
        />
      )
    }
    if (kind === "cycle") {
      const cycleTiles =
        config.cycle.tiles ?? BOARD_SETTINGS.cycleTiles.defaultValue
      const cycleSurface =
        config.cycle.surface ?? BOARD_SETTINGS.cycleSurface.defaultValue
      const cycleLoading =
        !ready ||
        (cyclePoints.loading && cyclePoints.data.length === 0 && !cycleError)

      if (cycleSurface === "display") {
        if (cycleLoading) {
          return <CycleHireDocksDisplaySkeleton tiles={cycleTiles} />
        }
        return (
          <CycleHireDocksDisplay
            data={cyclePoints.data}
            tiles={cycleTiles}
            behaviour={config.behaviour}
            startDelayMs={unattended ? 1200 : undefined}
            error={cycleError}
          />
        )
      }

      if (cycleLoading) {
        return <CycleHireMapSkeleton tiles={cycleTiles} />
      }
      if (cycleError) {
        return (
          <div
            className="flex items-center text-base text-destructive"
            style={{
              ...ARRIVALS_RHYTHM_VARS,
              height: `calc(var(--arrivals-row) * ${cycleTiles})`,
            }}
            role="alert"
          >
            {cycleError}
          </div>
        )
      }
      return (
        <CycleHireDocksMap
          data={cyclePoints.data}
          tiles={cycleTiles}
          showNavigation={!unattended}
        />
      )
    }

    if (
      !ready ||
      (status.loading && status.data.length === 0 && !status.error)
    ) {
      return unattended ? (
        <TubeStatusDisplaySkeleton tiles={statusProps.tiles || 4} />
      ) : (
        <TubeStatusBoardSkeleton />
      )
    }
    if (unattended && statusProps.surface === "strip") {
      return (
        <TubeStatusStrip
          data={statusData}
          now={status.fetchedAt ?? undefined}
          units={statusProps.tiles || 4}
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
        priorityLineIds={
          statusProps.detailScope === "network"
            ? statusProps.detailLineIds
            : undefined
        }
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
        className={
          wide && twoColumns
            ? "min-w-0 overflow-x-clip md:col-span-2"
            : "min-w-0 overflow-x-clip"
        }
        aria-label={label}
      >
        <div className={`grid min-w-0 grid-cols-1 ${BOARD_RHYTHM_GAP_CLASS}`}>
          {kinds.map((kind) => (
            <div key={kind} className="min-w-0">
              {renderPanel(kind)}
            </div>
          ))}
        </div>
      </section>
    )
  }

  return (
    <div
      className={
        embedded
          ? "board-embed box-border h-dvh w-full overflow-y-auto overscroll-y-contain p-4 [scrollbar-width:none] [touch-action:pan-y] [&::-webkit-scrollbar]:hidden md:p-6"
          : "box-border min-h-dvh w-full p-4 md:p-6"
      }
      style={ARRIVALS_RHYTHM_VARS}
    >
      <h1 className="sr-only">Live board</h1>
      <div
        className={
          twoColumns
            ? `grid min-w-0 grid-cols-1 items-start ${BOARD_RHYTHM_GAP_CLASS} md:grid-cols-3 md:gap-x-6`
            : `grid min-w-0 grid-cols-1 items-start ${BOARD_RHYTHM_GAP_CLASS}`
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
      <BoardViewFooter
        sources={pollSources}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        editHref={`${BOARD_PATH}${configEpoch}`}
      />
    </div>
  )
}
