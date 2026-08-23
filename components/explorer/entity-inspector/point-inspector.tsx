"use client"

import { Suspense, use, useEffect, useState } from "react"
import type { RealtimePrediction } from "tfl-ts"
import { DataSourceLabel } from "@/components/docs/data-source-label"
import { BusArrivalsBoard } from "@/components/tfl/arrivals/bus-arrivals-board"
import { RiverBusArrivalsBoard } from "@/components/tfl/arrivals/river-bus-arrivals-board"
import { TubeStatusBoard } from "@/components/tfl/status/tube-status-board"
import { resolveBusStopLetter } from "@/lib/tfl/bus-stop-letter"
import {
  isBoardableBusStopId,
  isBusStopAreaId,
  mapStopsFromGeoResponse,
  readCompassBearingDegrees,
  readCompassPoint,
} from "@/lib/tfl/bus-stop-shape"
import { MAP_SEARCH_RADIUS_METERS } from "@/lib/tfl/geo"
import { RailArrivalsBoard } from "@/components/tfl/arrivals/rail-arrivals-board"
import { CycleHireDocksDetail } from "@/components/tfl/cycle-hire/cycle-hire-docks"
import { Button } from "@/components/ui/button"
import {
  AdditionalPropertiesDisclosure,
  CodeSnippet,
  CopyableField,
  EntityInspectorShell,
  InspectorJson,
  type StopAdditionalProperty,
} from "@/components/explorer/entity-inspector/entity-inspector"
import { useExplorerKeyedQuery } from "@/hooks/use-explorer-keyed-query"
import { getCachedLineStatusesAction } from "@/lib/tfl/cached-status-action"
import { compareArrivalsLines } from "@/lib/tfl/arrivals-line-sort"
import { lookupBoardStationLineGroups } from "@/lib/tfl/board-station-lines"
import {
  prepareBusStopDisruptions,
  type RawBusStopDisruption,
} from "@/lib/tfl/prepare-bus-stop-disruptions"
import type { CycleHireDock } from "@/lib/tfl/cycle-hire-types"
import type { StatusLine } from "@/lib/tfl/status-types"
import type { ExplorerPoint } from "@/lib/tfl/explorer-point-normalise"
import {
  cachedArrivalsForPoint,
  type ExplorerCachedArrivals,
} from "@/lib/tfl/explorer/selection"
import { buildExplorerHref } from "@/lib/tfl/explorer-url-state"
import type { ExplorerDomain } from "@/lib/tfl/explorer-url-state"
import { getLineNameTiers, railLineModeName } from "@/lib/tfl/line-names"
import {
  filterRiverBusLineIds,
  isRiverBusLineId,
  pointHasRiverBusLine,
} from "@/lib/tfl/river-bus"

type PointInspectorProps = {
  point: ExplorerPoint
  /** Optional preloaded cycle dock for cached occupancy preview. */
  cycleDock?: CycleHireDock | null
  /** Site-cached arrivals for a catalog / featured stop. */
  cachedArrivals?: ExplorerCachedArrivals | null
}

type PointInspectorDeferredProps = Omit<
  PointInspectorProps,
  "cachedArrivals"
> & {
  /** Unresolved catalog arrivals — inspector identity paints while this streams. */
  cachedArrivalsPromise?: Promise<ExplorerCachedArrivals | null>
  /** Local selection has not caught up to the URL yet — skip a stale promise. */
  detailsPending?: boolean
}

type LiveStopChild = {
  id: string
  name: string
  stopLetter?: string
  stopType?: string
  modes?: string[]
}

type LiveStopMeta = {
  requestedId: string
  id?: string
  stopType?: string
  stationNaptan?: string
  hubNaptanCode?: string
  compassPoint?: string
  compassBearingDegrees?: number
  children: LiveStopChild[]
}

const explorerDomainForChild = (child: LiveStopChild): ExplorerDomain => {
  if (child.modes?.includes("cycle-hire") || /^BikePoints_/i.test(child.id)) {
    return "cycle"
  }
  if (child.modes?.includes("river-bus") || /^930/i.test(child.id)) {
    return "river"
  }
  if (child.modes?.includes("bus") || /^490/i.test(child.id)) {
    return "bus"
  }
  return "tube-rail"
}

const readLiveStopChildren = (
  children:
    | Array<{
        id?: string
        commonName?: string
        name?: string
        stopLetter?: string
        stopType?: string
        modes?: string[]
      }>
    | undefined
): LiveStopChild[] => {
  const list: LiveStopChild[] = []
  for (const child of children ?? []) {
    const id = child.id?.trim()
    if (!id) continue
    list.push({
      id,
      name: (child.commonName ?? child.name)?.trim() || id,
      stopLetter: child.stopLetter,
      stopType: child.stopType,
      modes: child.modes,
    })
  }
  return list
}

const mergeLiveStopChildren = (
  ...lists: LiveStopChild[][]
): LiveStopChild[] => {
  const seen = new Set<string>()
  const merged: LiveStopChild[] = []
  for (const child of lists.flat()) {
    if (seen.has(child.id)) continue
    seen.add(child.id)
    merged.push(child)
  }
  return merged
}

const readLiveStopMeta = (
  requestedId: string,
  stop: {
    id?: string
    stopType?: string
    stationNaptan?: string
    hubNaptanCode?: string
    children?: Array<{
      id?: string
      commonName?: string
      name?: string
      stopLetter?: string
      stopType?: string
      modes?: string[]
    }>
    compassPoint?: string
    compassBearingDegrees?: number
  }
): LiveStopMeta => ({
  requestedId,
  id: stop.id,
  stopType: stop.stopType,
  stationNaptan: stop.stationNaptan,
  hubNaptanCode: stop.hubNaptanCode,
  compassPoint: stop.compassPoint,
  compassBearingDegrees: stop.compassBearingDegrees,
  children: readLiveStopChildren(stop.children),
})

const PointInspectorFromPromise = ({
  cachedArrivalsPromise,
  ...props
}: Omit<
  PointInspectorDeferredProps,
  "cachedArrivalsPromise" | "detailsPending"
> & {
  cachedArrivalsPromise: Promise<ExplorerCachedArrivals | null>
}) => {
  const cachedArrivals = use(cachedArrivalsPromise)
  return <PointInspector {...props} cachedArrivals={cachedArrivals} />
}

/** Point inspector that streams seed arrivals without blocking identity. */
export const PointInspectorDeferred = ({
  cachedArrivalsPromise,
  detailsPending = false,
  ...props
}: PointInspectorDeferredProps) => {
  if (detailsPending || !cachedArrivalsPromise) {
    return <PointInspector {...props} />
  }

  return (
    <Suspense fallback={<PointInspector {...props} />}>
      <PointInspectorFromPromise
        {...props}
        cachedArrivalsPromise={cachedArrivalsPromise}
      />
    </Suspense>
  )
}

/** Shared "needs a personal key" prompt — reused by point and line inspectors. */
export const KeyPrompt = ({
  purpose,
  onAddKey,
}: {
  purpose: string
  onAddKey: () => void
}) => (
  <div className="space-y-3">
    <p className="text-sm text-muted-foreground">{purpose}</p>
    <Button type="button" size="sm" onClick={onAddKey}>
      Add TfL API key
    </Button>
  </div>
)

const PointInspectorLive = ({
  point,
  cycleDock,
  cachedArrivals = null,
}: PointInspectorProps) => {
  const { ready, hydrated, loading, error, runKeyed, openDialog } =
    useExplorerKeyedQuery()
  const [arrivals, setArrivals] = useState<RealtimePrediction[] | null>(null)
  const [arrivalsFetchedAt, setArrivalsFetchedAt] = useState<number | null>(
    null
  )
  const [disruptions, setDisruptions] = useState<RawBusStopDisruption[]>([])
  const [riverStatuses, setRiverStatuses] = useState<StatusLine[]>([])
  const [statusFetchedAt, setStatusFetchedAt] = useState<number | null>(null)
  const [liveDock, setLiveDock] = useState<CycleHireDock | null>(
    cycleDock ?? null
  )
  const [dockFetchedAt, setDockFetchedAt] = useState<number | null>(null)
  const [stopProperties, setStopProperties] = useState<
    StopAdditionalProperty[] | null
  >(null)
  const [liveStop, setLiveStop] = useState<LiveStopMeta | null>(null)
  const [arrivalsPointId, setArrivalsPointId] = useState<string | null>(null)

  const isRiver = pointHasRiverBusLine(point.lineIds)
  const riverLineIds = isRiver ? filterRiverBusLineIds(point.lineIds) : []
  const riverLineKey = riverLineIds.join(",")
  const isBus =
    !isRiver &&
    point.kind === "stopPoint" &&
    (isBusStopAreaId(point.id) ||
      point.modes?.includes("bus") ||
      Boolean(point.stopLetter || point.smsCode))
  const isBike = point.kind === "bikePoint"
  const seedArrivals = cachedArrivalsForPoint(cachedArrivals, point)
  const pollStopIds = point.arrivalsStopIds?.length
    ? point.arrivalsStopIds
    : [point.id]
  const pollStopKey = pollStopIds.join(",")
  const isHub = (point.hubMembers?.length ?? 0) > 1
  const isBusArea = isBusStopAreaId(point.id)
  const skipArrivalsPreview = isBusArea
  const displayArrivals =
    (arrivalsPointId === point.id ? arrivals : null) ??
    seedArrivals?.arrivals ??
    null
  const activeLiveStop = liveStop?.requestedId === point.id ? liveStop : null
  const resolvedStopLetter = isBus
    ? resolveBusStopLetter(point.stopLetter, displayArrivals ?? [])
    : (point.stopLetter ?? null)

  useEffect(() => {
    if (!hydrated || !ready) return

    let cancelled = false
    const pointId = point.id
    const stopPointIds = pollStopKey.split(",").filter(Boolean)

    const load = async () => {
      if (isBike) {
        const result = await runKeyed(async (client) =>
          client.bikePoint.getById(pointId, { keepTflTypes: true })
        )
        if (cancelled || !result.ok) return
        setLiveDock(result.data)
        setStopProperties(result.data.additionalProperties ?? [])
        setDockFetchedAt(Date.now())
        return
      }

      if (skipArrivalsPreview) {
        const result = await runKeyed(async (client) => {
          const stopDetail = await client.stopPoint.get({
            stopPointIds: [pointId],
          })
          const stop = Array.isArray(stopDetail) ? stopDetail[0] : stopDetail
          const meta = stop
            ? readLiveStopMeta(pointId, stop)
            : { requestedId: pointId, children: [] }
          const hasBoardable = meta.children.some(
            (child) => child.id !== pointId && isBoardableBusStopId(child.id)
          )
          const lat =
            stop && typeof stop.lat === "number" ? stop.lat : undefined
          const lon =
            stop && typeof stop.lon === "number" ? stop.lon : undefined
          if (hasBoardable || lat === undefined || lon === undefined) {
            return { stop, meta }
          }
          const nearby = await client.stopPoint.getByGeoPoint({
            lat,
            lon,
            radius: MAP_SEARCH_RADIUS_METERS,
            modes: ["bus"],
            returnLines: true,
          })
          const boarding = mapStopsFromGeoResponse(
            nearby.stopPoints ?? [],
            25
          ).map((child) => ({
            id: child.id,
            name: child.name,
            stopLetter: child.stopLetter,
            modes: ["bus"],
          }))
          return {
            stop,
            meta: {
              ...meta,
              children: mergeLiveStopChildren(boarding, meta.children),
            },
          }
        })
        if (cancelled || !result.ok) return
        setStopProperties(result.data.stop?.additionalProperties ?? [])
        setLiveStop(result.data.meta)
        return
      }

      const result = await runKeyed(async (client) => {
        const [predictions, stopDisruptions, lineStatuses, stopDetail] =
          await Promise.all([
            client.stopPoint.getArrivals({
              stopPointIds,
              sortBy: "timeToStation",
            }),
            isBus || isRiver
              ? client.stopPoint.getDisruption({ stopPointIds })
              : [],
            isRiver && riverLineIds.length > 0
              ? client.line.getStatus({ lineIds: riverLineIds })
              : [],
            client.stopPoint.get({ stopPointIds: [pointId] }),
          ])
        return { predictions, stopDisruptions, lineStatuses, stopDetail }
      })
      if (cancelled || !result.ok) return
      setArrivals(result.data.predictions)
      setArrivalsPointId(pointId)
      setDisruptions(result.data.stopDisruptions)
      setArrivalsFetchedAt(Date.now())
      const stopDetail = result.data.stopDetail
      const stop = Array.isArray(stopDetail) ? stopDetail[0] : stopDetail
      setStopProperties(stop?.additionalProperties ?? [])
      setLiveStop(
        stop
          ? readLiveStopMeta(pointId, stop)
          : { requestedId: pointId, children: [] }
      )
      if (isRiver) {
        setRiverStatuses(result.data.lineStatuses)
        setStatusFetchedAt(Date.now())
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [
    hydrated,
    ready,
    point.id,
    pollStopKey,
    skipArrivalsPreview,
    isBike,
    isBus,
    isRiver,
    riverLineKey,
    runKeyed,
  ])

  useEffect(() => {
    if (!hydrated || ready || !isRiver || riverLineIds.length === 0) return

    let cancelled = false
    const load = async () => {
      const payload = await getCachedLineStatusesAction(riverLineIds)
      if (cancelled) return
      setRiverStatuses(payload.data)
      setStatusFetchedAt(payload.fetchedAt)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [hydrated, ready, isRiver, riverLineKey])

  const handleRefreshArrivals = async () => {
    const stopPointIds = [...pollStopIds]
    const result = await runKeyed(async (client) => {
      const [predictions, stopDisruptions, lineStatuses] = await Promise.all([
        client.stopPoint.getArrivals({
          stopPointIds,
          sortBy: "timeToStation",
        }),
        isBus || isRiver
          ? client.stopPoint.getDisruption({ stopPointIds })
          : [],
        isRiver && riverLineIds.length > 0
          ? client.line.getStatus({ lineIds: riverLineIds })
          : [],
      ])
      return { predictions, stopDisruptions, lineStatuses }
    })
    if (result.ok) {
      setArrivals(result.data.predictions)
      setArrivalsPointId(point.id)
      setDisruptions(result.data.stopDisruptions)
      setArrivalsFetchedAt(Date.now())
      if (isRiver) {
        setRiverStatuses(result.data.lineStatuses)
        setStatusFetchedAt(Date.now())
      }
    }
  }

  const handleRefreshDock = async () => {
    const result = await runKeyed(async (client) =>
      client.bikePoint.getById(point.id, { keepTflTypes: true })
    )
    if (result.ok) {
      setLiveDock(result.data)
      setStopProperties(result.data.additionalProperties ?? [])
      setDockFetchedAt(Date.now())
    }
  }

  const propertyBag =
    isBike || activeLiveStop != null
      ? (stopProperties ?? point.additionalProperties)
      : point.additionalProperties
  const areaChildren = skipArrivalsPreview
    ? (activeLiveStop?.children.filter((child) => child.id !== point.id) ?? [])
    : []
  const boardingChildren = areaChildren.filter((child) =>
    isBoardableBusStopId(child.id)
  )
  const otherChildren = areaChildren.filter(
    (child) => !isBoardableBusStopId(child.id)
  )
  const liveCompassPoint =
    point.compassPoint ??
    activeLiveStop?.compassPoint ??
    readCompassPoint(propertyBag)
  const liveBearingDegrees =
    point.compassBearingDegrees ??
    activeLiveStop?.compassBearingDegrees ??
    readCompassBearingDegrees(propertyBag)
  const compassValue =
    liveCompassPoint && liveBearingDegrees !== undefined
      ? `${liveCompassPoint} (${liveBearingDegrees}°)`
      : (liveCompassPoint ??
        (liveBearingDegrees !== undefined
          ? `${liveBearingDegrees}°`
          : undefined))

  const identity = (
    <div>
      <CopyableField label="ID" value={point.id} />
      <CopyableField label="Name" value={point.name} />
      {isHub && point.hubId ? (
        <CopyableField label="Hub" value={point.hubId} />
      ) : null}
      {point.smsCode ? (
        <CopyableField label="SMS code" value={point.smsCode} />
      ) : null}
      {resolvedStopLetter ? (
        <CopyableField label="Stop letter" value={resolvedStopLetter} />
      ) : null}
      {point.zone ? <CopyableField label="Zone" value={point.zone} /> : null}
      {point.modes?.length ? (
        <CopyableField label="Modes" value={point.modes.join(", ")} />
      ) : null}
      {typeof point.lat === "number" && typeof point.lon === "number" ? (
        <CopyableField
          label="Coordinates"
          value={`${point.lat.toFixed(5)}, ${point.lon.toFixed(5)}`}
        />
      ) : null}
      {point.towards ? (
        <CopyableField label="Towards" value={point.towards} />
      ) : null}
      {compassValue ? (
        <CopyableField label="Compass" value={compassValue} />
      ) : null}
      {activeLiveStop?.stopType ? (
        <CopyableField label="Stop type" value={activeLiveStop.stopType} />
      ) : null}
      {activeLiveStop?.id && activeLiveStop.id !== point.id ? (
        <CopyableField label="Returned as" value={activeLiveStop.id} />
      ) : null}
      {activeLiveStop?.hubNaptanCode &&
      activeLiveStop.hubNaptanCode !== point.hubId &&
      activeLiveStop.hubNaptanCode !== activeLiveStop.id ? (
        <CopyableField label="Hub" value={activeLiveStop.hubNaptanCode} />
      ) : null}
      {isHub ? (
        <div className="pt-3">
          <p className="text-xs text-muted-foreground">
            StopPoints in this hub. Poll each id that carries the line you want.
          </p>
          {point.hubMembers?.map((member) => (
            <CopyableField
              key={member.id}
              label={member.name}
              value={member.id}
            />
          ))}
        </div>
      ) : null}
      {boardingChildren.length > 0 ? (
        <div className="pt-3">
          <p className="text-xs text-muted-foreground">
            Boarding stops. Arrivals are on these ids, not this area.
          </p>
          {boardingChildren.map((child) => (
            <CopyableField
              key={child.id}
              label={
                child.stopLetter
                  ? `${child.name} (${child.stopLetter})`
                  : child.name
              }
              value={child.id}
              href={buildExplorerHref({
                kind: "points",
                domain: explorerDomainForChild(child),
                id: child.id,
              })}
            />
          ))}
        </div>
      ) : null}
      {otherChildren.length > 0 ? (
        <div className="pt-3">
          <p className="text-xs text-muted-foreground">
            Other StopPoints in this interchange.
          </p>
          {otherChildren.map((child) => (
            <CopyableField
              key={child.id}
              label={child.name}
              value={child.id}
              href={buildExplorerHref({
                kind: "points",
                domain: explorerDomainForChild(child),
                id: child.id,
              })}
            />
          ))}
        </div>
      ) : null}
      {propertyBag ? (
        <div className="pt-3">
          <AdditionalPropertiesDisclosure
            key={point.id}
            properties={propertyBag}
          />
        </div>
      ) : null}
    </div>
  )

  const relationshipLineIds = [
    ...(isRiver ? filterRiverBusLineIds(point.lineIds) : (point.lineIds ?? [])),
  ].sort((a, b) =>
    compareArrivalsLines(
      { lineId: a, lineName: getLineNameTiers(a).full },
      { lineId: b, lineName: getLineNameTiers(b).full }
    )
  )

  const stopIdForLine = (lineId: string): string | undefined =>
    point.hubMembers?.find((member) => member.lineIds.includes(lineId))?.id

  const relationshipDomain = isRiver ? "river" : isBus ? "bus" : "tube-rail"

  const relationships = relationshipLineIds.length ? (
    <ul className="space-y-1" role="list">
      {relationshipLineIds.map((lineId) => {
        const href = buildExplorerHref({
          kind: "lines",
          domain: relationshipDomain,
          id: lineId,
        })
        const memberId = stopIdForLine(lineId)
        return (
          <li
            key={lineId}
            className="flex items-baseline gap-3 border-b border-border py-1.5 last:border-0"
          >
            <a
              href={href}
              className="min-w-0 truncate text-sm underline-offset-4 hover:underline"
            >
              {getLineNameTiers(lineId).full}
            </a>
            {memberId ? (
              <code className="ml-auto shrink-0 text-xs text-muted-foreground">
                {memberId}
              </code>
            ) : null}
          </li>
        )
      })}
    </ul>
  ) : (
    <p className="text-sm text-muted-foreground">
      No line relationships loaded.
    </p>
  )

  const displayDock = liveDock ?? cycleDock ?? null

  const busStopDisruptions = isBus
    ? prepareBusStopDisruptions(disruptions, displayArrivals ?? [])
    : []
  const riverStopDisruptions = isRiver
    ? prepareBusStopDisruptions(
        disruptions,
        (displayArrivals ?? []).filter((row) =>
          isRiverBusLineId(row.lineId ?? "")
        )
      ).filter((item) => isRiverBusLineId(item.lineId))
    : []

  const railLineGroups =
    isRiver || isBus ? undefined : lookupBoardStationLineGroups(point.id)
  const railPageSizeByLine = (() => {
    if (!railLineGroups?.length) return undefined
    const map: Record<string, number> = {}
    for (const group of railLineGroups) {
      if (typeof group.pageSize !== "number") continue
      for (const lineId of group.lines) map[lineId] = group.pageSize
    }
    return Object.keys(map).length > 0 ? map : undefined
  })()

  const arrivalsBoard = displayArrivals ? (
    isRiver ? (
      <RiverBusArrivalsBoard
        data={displayArrivals}
        disruptions={riverStopDisruptions}
        stopName={point.name}
        headingLevel={2}
        maxRows={8}
      />
    ) : isBus ? (
      <BusArrivalsBoard
        data={displayArrivals}
        disruptions={busStopDisruptions}
        stopName={point.name}
        stopLetter={resolvedStopLetter ?? undefined}
        headingLevel={2}
        maxRows={8}
      />
    ) : (
      <RailArrivalsBoard
        data={displayArrivals}
        now={arrivalsFetchedAt ?? undefined}
        stopName={point.name}
        lines={relationshipLineIds.map((lineId) => ({
          lineId,
          lineName: getLineNameTiers(lineId).full,
          modeName: railLineModeName(lineId),
        }))}
        lineGroups={railLineGroups}
        pageSizeByLine={railPageSizeByLine}
        headingLevel={2}
        maxRows={8}
      />
    )
  ) : null

  const stopPreview = () => {
    if (skipArrivalsPreview) {
      return (
        <div className="space-y-3">
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <p className="text-sm text-muted-foreground">
            This id is a stop area, not a boarding flag. TfL returns no arrivals
            here — open a child stand instead.
          </p>
        </div>
      )
    }
    if (ready) {
      return (
        <div className="space-y-3">
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          {arrivalsBoard}
          {isRiver && riverStatuses.length > 0 ? (
            <TubeStatusBoard
              data={riverStatuses}
              now={statusFetchedAt ?? undefined}
              compact
              hideHeader
            />
          ) : null}
          <DataSourceLabel
            source="live"
            fetchedAt={arrivalsFetchedAt ?? undefined}
            loading={loading}
            onRefresh={handleRefreshArrivals}
          />
        </div>
      )
    }
    if (seedArrivals && arrivalsBoard) {
      return (
        <div className="space-y-3">
          {arrivalsBoard}
          {isRiver && riverStatuses.length > 0 ? (
            <TubeStatusBoard
              data={riverStatuses}
              now={statusFetchedAt ?? undefined}
              compact
              hideHeader
            />
          ) : null}
          <DataSourceLabel source="cached" />
        </div>
      )
    }
    if (!hydrated) {
      return (
        <p className="text-sm text-muted-foreground">
          Checking for a TfL API key…
        </p>
      )
    }
    return (
      <KeyPrompt
        purpose="Live arrivals for this stop use your TfL API key."
        onAddKey={openDialog}
      />
    )
  }

  const bikePreview = () => {
    if (ready) {
      return (
        <div className="space-y-3">
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          {displayDock ? (
            <CycleHireDocksDetail data={[displayDock]} hideHeader />
          ) : null}
          <DataSourceLabel
            source="live"
            fetchedAt={dockFetchedAt ?? undefined}
            loading={loading}
            onRefresh={handleRefreshDock}
          />
        </div>
      )
    }
    if (displayDock) {
      return (
        <div className="space-y-3">
          <CycleHireDocksDetail data={[displayDock]} hideHeader />
          <DataSourceLabel source="cached" />
        </div>
      )
    }
    if (!hydrated) {
      return (
        <p className="text-sm text-muted-foreground">
          Checking for a TfL API key…
        </p>
      )
    }
    return (
      <KeyPrompt
        purpose="Live occupancy for this dock uses your TfL API key."
        onAddKey={openDialog}
      />
    )
  }

  const preview = isBike ? bikePreview() : stopPreview()

  const code = (
    <div className="space-y-2">
      <CodeSnippet
        title="stopPoint.get / bikePoint.getById"
        code={
          isBike
            ? `await client.bikePoint.getById("${point.id}")`
            : `await client.stopPoint.get("${point.id}")`
        }
      />
      {!isBike && !skipArrivalsPreview ? (
        <CodeSnippet
          title="stopPoint.getArrivals"
          code={`await client.stopPoint.getArrivals({\n  stopPointIds: ${JSON.stringify(pollStopIds)},\n  sortBy: "timeToStation",\n})`}
        />
      ) : null}
      {!isBike ? (
        <CodeSnippet
          title="stopPoint.getRoute"
          code={`await client.stopPoint.getRoute("${point.id}")`}
        />
      ) : null}
      {isRiver && riverLineIds.length > 0 ? (
        <CodeSnippet
          title="line.getStatus"
          code={`await client.line.getStatus({\n  lineIds: ${JSON.stringify(riverLineIds)},\n})`}
        />
      ) : null}
    </div>
  )

  return (
    <EntityInspectorShell
      title={point.name}
      subtitle={
        point.kind === "bikePoint"
          ? "BikePoint"
          : isHub || activeLiveStop?.stopType === "TransportInterchange"
            ? "Station hub"
            : isBusArea
              ? "Bus stop area"
              : isRiver
                ? "Pier"
                : "StopPoint"
      }
      identity={identity}
      preview={preview}
      relationships={relationships}
      normalised={
        <InspectorJson
          value={
            isBike && displayDock
              ? displayDock
              : {
                  id: point.id,
                  name: point.name,
                  kind: point.kind,
                  modes: point.modes,
                  lineIds: point.lineIds,
                  hubId: point.hubId,
                  hubMembers: point.hubMembers,
                  arrivalsStopIds: pollStopIds,
                  aliasIds: point.aliasIds,
                  zone: point.zone,
                  lat: point.lat,
                  lon: point.lon,
                  stopLetter: resolvedStopLetter ?? point.stopLetter,
                  smsCode: point.smsCode,
                  towards: point.towards,
                  compassPoint: liveCompassPoint,
                  compassBearingDegrees: liveBearingDegrees,
                  bikes: displayDock?.bikes ?? point.bikes,
                  spaces: displayDock?.spaces ?? point.spaces,
                }
          }
        />
      }
      code={code}
    />
  )
}

/** Remount live arrivals/occupancy state when the selected point changes. */
export const PointInspector = (props: PointInspectorProps) => (
  <PointInspectorLive key={props.point.id} {...props} />
)
