"use client"

import { Suspense, use, useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import { DataSourceLabel } from "@/components/docs/data-source-label"
import {
  CodeSnippet,
  CopyableField,
  EntityInspectorShell,
  InspectorJson,
  InspectorSection,
} from "@/components/explorer/entity-inspector/entity-inspector"
import { KeyPrompt } from "@/components/explorer/entity-inspector/point-inspector"
import { OverflowRevealText } from "@/components/explorer/overflow-reveal-text"
import { LineColorBar } from "@/components/tfl/brand/line-badge"
import { TubeStatusBoard } from "@/components/tfl/status/tube-status-board"
import { Skeleton } from "@/components/ui/skeleton"
import { useExplorerKeyedQuery } from "@/hooks/use-explorer-keyed-query"
import { formatStationName } from "@/lib/tfl/diagram-station"
import {
  buildExplorerHref,
  type ExplorerDirection,
  type ExplorerDomain,
} from "@/lib/tfl/explorer-url-state"
import type {
  ExplorerLineDetailsPayload,
  ExplorerLineRoute,
  ExplorerLineSummary,
} from "@/lib/tfl/explorer/common"
import { shapeExplorerLineRoute } from "@/lib/tfl/explorer/line-route-shape"
import type { StatusLine } from "@/lib/tfl/status-types"
import { cn } from "@/lib/utils"

type LineInspectorDomain = Exclude<ExplorerDomain, "cycle">

type LineInspectorProps = {
  line: ExplorerLineSummary
  direction: ExplorerDirection
  domain: LineInspectorDomain
  detailsPromise?: Promise<ExplorerLineDetailsPayload> | null
  detailsPending?: boolean
  onDirectionChange?: (direction: ExplorerDirection) => void
}

const LineDirectionToggle = ({
  lineId,
  direction,
  domain,
  onDirectionChange,
}: {
  lineId: string
  direction: ExplorerDirection
  domain: LineInspectorDomain
  onDirectionChange?: (direction: ExplorerDirection) => void
}) => {
  const inboundHref = buildExplorerHref({
    kind: "lines",
    domain,
    id: lineId,
    dir: "inbound",
  })
  const outboundHref = buildExplorerHref({
    kind: "lines",
    domain,
    id: lineId,
    dir: "outbound",
  })

  return (
    <div className="border-b border-border py-2">
      <p className="text-xs text-muted-foreground">Direction</p>
      <p className="text-sm">
        <Link
          href={inboundHref}
          scroll={false}
          onClick={() => onDirectionChange?.("inbound")}
          className={cn(
            "underline-offset-4 hover:underline",
            direction === "inbound" && "font-semibold"
          )}
        >
          inbound
        </Link>
        {" · "}
        <Link
          href={outboundHref}
          scroll={false}
          onClick={() => onDirectionChange?.("outbound")}
          className={cn(
            "underline-offset-4 hover:underline",
            direction === "outbound" && "font-semibold"
          )}
        >
          outbound
        </Link>
      </p>
    </div>
  )
}

const LineInspectorDetailsFallback = ({
  directionToggle,
}: {
  directionToggle: ReactNode
}) => (
  <>
    <InspectorSection title="Preview">
      <div className="space-y-2" aria-busy aria-label="Loading line status">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-48" />
      </div>
    </InspectorSection>
    <InspectorSection title="Relationships">
      <div className="space-y-2" aria-busy aria-label="Loading stop sequence">
        {directionToggle}
        <Skeleton className="h-4 w-40" />
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-8 w-full" />
        ))}
      </div>
    </InspectorSection>
  </>
)

/** Ordered stop list — shared by the cached seed path and the keyed live path. */
const OrderedStopsList = ({
  stops,
  direction,
  domain,
}: {
  stops: ExplorerLineRoute["stops"]
  direction: ExplorerDirection
  domain: LineInspectorDomain
}) => (
  <>
    <p className="text-xs text-muted-foreground">Ordered stops ({direction})</p>
    {stops.length === 0 ? (
      <p className="text-sm text-muted-foreground">
        No stop sequence returned for this line.
      </p>
    ) : (
      <ol className="m-0 grid list-none grid-cols-[3ch_minmax(0,1fr)_auto] gap-x-3 p-0">
        {stops.map((stop, index) => {
          const stopHref = stop.id
            ? buildExplorerHref({
                kind: "points",
                domain,
                id: stop.id,
              })
            : undefined
          const displayName = formatStationName(stop.name ?? "Unknown")
          return (
            <li
              key={`${stop.id ?? stop.name}-${index}`}
              className="col-span-3 grid grid-cols-subgrid items-center border-b border-border py-1.5 text-sm last:border-0"
            >
              <span className="text-end text-muted-foreground tabular-nums">
                {index + 1}
              </span>
              <OverflowRevealText
                href={stopHref}
                text={displayName}
                className="font-medium"
              />
              {stop.id ? (
                <code className="text-xs text-muted-foreground">{stop.id}</code>
              ) : (
                <span />
              )}
            </li>
          )
        })}
      </ol>
    )}
  </>
)

type LineInspectorDetailsProps = {
  detailsPromise: Promise<ExplorerLineDetailsPayload>
  expectedLineId: string
  expectedDirection: ExplorerDirection
  domain: LineInspectorDomain
  directionToggle: ReactNode
}

const LineInspectorDetails = ({
  detailsPromise,
  expectedLineId,
  expectedDirection,
  domain,
  directionToggle,
}: LineInspectorDetailsProps) => {
  const payload = use(detailsPromise)
  const { ready, hydrated, loading, error, runKeyed } = useExplorerKeyedQuery()
  const [liveStatus, setLiveStatus] = useState<StatusLine | null>(null)
  const [statusFetchedAt, setStatusFetchedAt] = useState<number | null>(null)

  const lineId = payload.lineId
  const route = payload.route
  const status = payload.status
  const direction = payload.direction
  const stale = lineId !== expectedLineId || direction !== expectedDirection

  useEffect(() => {
    if (!hydrated || !ready) return

    let cancelled = false

    const load = async () => {
      const result = await runKeyed(async (client) => {
        const statuses = await client.line.getStatus({ lineIds: [lineId] })
        return statuses[0] ?? null
      })
      if (cancelled || !result.ok) return
      setLiveStatus(result.data)
      setStatusFetchedAt(Date.now())
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [hydrated, ready, lineId, runKeyed])

  if (stale) {
    return <LineInspectorDetailsFallback directionToggle={directionToggle} />
  }

  const displayStatus = liveStatus ?? status ?? null

  const handleRefreshStatus = async () => {
    const result = await runKeyed(async (client) => {
      const statuses = await client.line.getStatus({ lineIds: [lineId] })
      return statuses[0] ?? null
    })
    if (result.ok) {
      setLiveStatus(result.data)
      setStatusFetchedAt(Date.now())
    }
  }

  return (
    <>
      <InspectorSection title="Preview">
        <div className="space-y-2">
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          {displayStatus ? (
            <TubeStatusBoard
              data={[displayStatus]}
              now={statusFetchedAt ?? undefined}
              compact
              hideHeader
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              {ready
                ? "Live status has not loaded yet."
                : "Cached status not loaded for this line."}
            </p>
          )}
        </div>
      </InspectorSection>

      <InspectorSection title="Relationships">
        <div className="space-y-2">
          {directionToggle}
          <OrderedStopsList
            stops={route.stops}
            direction={direction}
            domain={domain}
          />
        </div>
      </InspectorSection>

      {ready ? (
        <DataSourceLabel
          source="live"
          fetchedAt={statusFetchedAt ?? undefined}
          loading={loading}
          onRefresh={handleRefreshStatus}
        />
      ) : displayStatus ? (
        <DataSourceLabel source="cached" />
      ) : null}

      <InspectorSection title="Normalised data">
        <InspectorJson
          value={{
            id: lineId,
            direction,
            status: displayStatus
              ? {
                  id: displayStatus.id,
                  name: displayStatus.name,
                  lineStatuses: displayStatus.lineStatuses,
                }
              : null,
            stopCount: route.stops.length,
          }}
        />
      </InspectorSection>
    </>
  )
}

type LineInspectorLiveDetailsProps = {
  lineId: string
  direction: ExplorerDirection
  domain: LineInspectorDomain
  directionToggle: ReactNode
}

/**
 * Keyed live route + status when the server did not pass a details promise.
 * Visitor key only — no site-key fallback.
 */
const LineInspectorLiveDetails = ({
  lineId,
  direction,
  domain,
  directionToggle,
}: LineInspectorLiveDetailsProps) => {
  const { ready, hydrated, loading, error, runKeyed, openDialog } =
    useExplorerKeyedQuery()
  const [route, setRoute] = useState<ExplorerLineRoute | null>(null)
  const [status, setStatus] = useState<StatusLine | null>(null)
  const [fetchedAt, setFetchedAt] = useState<number | null>(null)

  const loadRouteAndStatus = async () =>
    runKeyed(async (client) => {
      const [lines, sequence, statuses] = await Promise.all([
        client.line.get({ lineIds: [lineId] }),
        client.line.getRouteSequence({ id: lineId, direction }),
        client.line.getStatus({ lineIds: [lineId] }),
      ])
      return {
        route: shapeExplorerLineRoute(lineId, lines, sequence),
        status: statuses[0] ?? null,
      }
    })

  useEffect(() => {
    if (!hydrated || !ready) return

    let cancelled = false

    const load = async () => {
      const result = await loadRouteAndStatus()
      if (cancelled || !result.ok) return
      setRoute(result.data.route)
      setStatus(result.data.status)
      setFetchedAt(Date.now())
    }

    void load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, ready, lineId, direction])

  const handleRefresh = async () => {
    const result = await loadRouteAndStatus()
    if (result.ok) {
      setRoute(result.data.route)
      setStatus(result.data.status)
      setFetchedAt(Date.now())
    }
  }

  if (!hydrated) {
    return <LineInspectorDetailsFallback directionToggle={directionToggle} />
  }

  if (!ready) {
    return (
      <>
        <InspectorSection title="Preview">
          <KeyPrompt
            purpose="Live status for this line uses your TfL API key."
            onAddKey={openDialog}
          />
        </InspectorSection>
        <InspectorSection title="Relationships">
          <div className="space-y-2">
            {directionToggle}
            <p className="text-sm text-muted-foreground">
              Add a TfL API key to load live status for this line.
            </p>
          </div>
        </InspectorSection>
      </>
    )
  }

  if (!route) {
    return <LineInspectorDetailsFallback directionToggle={directionToggle} />
  }

  return (
    <>
      <InspectorSection title="Preview">
        <div className="space-y-2">
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          {status ? (
            <TubeStatusBoard
              data={[status]}
              now={fetchedAt ?? undefined}
              compact
              hideHeader
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Live status has not loaded yet.
            </p>
          )}
        </div>
      </InspectorSection>

      <InspectorSection title="Relationships">
        <div className="space-y-2">
          {directionToggle}
          <OrderedStopsList
            stops={route.stops}
            direction={direction}
            domain={domain}
          />
        </div>
      </InspectorSection>

      <DataSourceLabel
        source="live"
        fetchedAt={fetchedAt ?? undefined}
        loading={loading}
        onRefresh={handleRefresh}
      />

      <InspectorSection title="Normalised data">
        <InspectorJson
          value={{
            id: lineId,
            direction,
            status: status
              ? {
                  id: status.id,
                  name: status.name,
                  lineStatuses: status.lineStatuses,
                }
              : null,
            stopCount: route.stops.length,
          }}
        />
      </InspectorSection>
    </>
  )
}

export const LineInspector = ({
  line,
  direction,
  domain,
  detailsPromise,
  detailsPending = false,
  onDirectionChange,
}: LineInspectorProps) => {
  const directionToggle = (
    <LineDirectionToggle
      lineId={line.id}
      direction={direction}
      domain={domain}
      onDirectionChange={onDirectionChange}
    />
  )

  const identity = (
    <div>
      <CopyableField label="Line ID" value={line.id} />
      <CopyableField label="Name" value={line.name} />
      {line.modeName ? (
        <CopyableField label="Mode" value={line.modeName} />
      ) : null}
      <div className="py-2">
        <LineColorBar lineId={line.id} modeName={line.modeName} />
      </div>
    </div>
  )

  const code = (
    <div className="space-y-2">
      <CodeSnippet
        title="line.getStatus"
        code={`await client.line.getStatus({ lineIds: ["${line.id}"] })`}
      />
      <CodeSnippet
        title="line.getRouteSequence"
        code={`await client.line.getRouteSequence({\n  id: "${line.id}",\n  direction: "${direction}",\n})`}
      />
      <CodeSnippet
        title="line.getStopPoints"
        code={`await client.line.getStopPoints("${line.id}")`}
      />
    </div>
  )

  const detailsFallback = (
    <LineInspectorDetailsFallback directionToggle={directionToggle} />
  )

  return (
    <EntityInspectorShell
      title={line.name}
      subtitle={`Line · ${line.modeName ?? domain}`}
      identity={identity}
      details={
        detailsPending ? (
          detailsFallback
        ) : detailsPromise ? (
          <Suspense fallback={detailsFallback}>
            <LineInspectorDetails
              key={line.id}
              detailsPromise={detailsPromise}
              expectedLineId={line.id}
              expectedDirection={direction}
              domain={domain}
              directionToggle={directionToggle}
            />
          </Suspense>
        ) : (
          <LineInspectorLiveDetails
            key={line.id}
            lineId={line.id}
            direction={direction}
            domain={domain}
            directionToggle={directionToggle}
          />
        )
      }
      code={code}
    />
  )
}
