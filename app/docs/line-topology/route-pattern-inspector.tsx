import type { Feature, LineString } from "geojson"
import type {
  LineSegmentProperties,
  TransitGeometryBundle,
} from "@/lib/tfl/geography-types"
import type {
  OsmRouteRelation,
  OsmRouteStop,
  OsmRouteStopsFile,
} from "@/lib/tfl/geometry/osm-route-stops"
import type {
  ServicePatternDataset,
  ServicePatternEvidence,
} from "@/lib/tfl/service-pattern-evidence"
import type { LngLat } from "@/lib/tfl/geometry/transit-track-graph"
import {
  matchExternalStopPatterns,
  normalisePatternStationName,
} from "@/lib/tfl/cross-source-pattern-matching"
import type { LineNetworkSlice } from "@/lib/tfl/network-model/line-slice"
import {
  formatDaysOfWeek,
  formatHeadway,
  patternLabel,
} from "@/lib/tfl/network-model/line-slice"
import {
  MINI_MAP_HEIGHT,
  MINI_MAP_WIDTH,
  miniPath,
} from "./relation-mini-map"

type OsmVariantSummary = {
  relationId: number
  featureIds: string[]
  paths: LngLat[][]
  pointCount: number
  from: string
  to: string
  name?: string
  direction?: string
  service?: string
  relation?: OsmRouteRelation
}

const relationIdFromFeature = (
  feature: Feature<LineString, LineSegmentProperties>
): number | null => {
  const value = String(feature.id ?? feature.properties.featureId)
  const match = value.match(/^relation\/(\d+)/)
  return match ? Number(match[1]) : null
}

const distanceSquared = (left: LngLat, right: LngLat): number => {
  const dx = left[0] - right[0]
  const dy = left[1] - right[1]
  return dx * dx + dy * dy
}

const nearestStopName = (
  point: LngLat | undefined,
  stops: readonly OsmRouteStop[]
): string | null => {
  if (!point) return null
  let name: string | null = null
  let best = Number.POSITIVE_INFINITY
  for (const stop of stops) {
    const distance = distanceSquared(point, stop.coordinates)
    if (distance < best) {
      name = stop.name
      best = distance
    }
  }
  return name
}

const fallbackCoordinateLabel = (point: LngLat | undefined): string =>
  point ? `${point[1].toFixed(4)}, ${point[0].toFixed(4)}` : "unknown"

const osmVariantSummaries = (
  bundle: TransitGeometryBundle | undefined,
  lineId: string,
  stopsFile: OsmRouteStopsFile | undefined
): OsmVariantSummary[] => {
  if (!bundle) return []
  const features = (bundle.lines.features ?? []).filter(
    (feature) => feature.properties.lineId === lineId
  )
  const relationById = new Map(
    (stopsFile?.relations ?? []).map((relation) => [
      relation.relationId,
      relation,
    ])
  )
  const byRelation = new Map<
    number,
    {
      features: Feature<LineString, LineSegmentProperties>[]
      relation?: OsmRouteRelation
    }
  >()
  for (const feature of features) {
    const relationId = relationIdFromFeature(feature)
    if (relationId == null) continue
    const group = byRelation.get(relationId) ?? {
      features: [],
      relation: relationById.get(relationId),
    }
    group.features.push(feature)
    byRelation.set(relationId, group)
  }

  return [...byRelation]
    .map(([relationId, group]) => {
      const paths = group.features.map(
        (feature) => feature.geometry.coordinates as LngLat[]
      )
      const firstPath = paths[0]
      const lastPath = paths[paths.length - 1]
      const firstPoint = firstPath?.[0]
      const lastPoint = lastPath?.[lastPath.length - 1]
      const relationStops =
        group.relation?.stops.filter((stop) => stop.name) ?? []
      const firstStop = relationStops[0]?.name
      const lastStop = relationStops[relationStops.length - 1]?.name
      const tags = group.relation?.tags
      return {
        relationId,
        featureIds: group.features.map((feature) =>
          String(feature.id ?? feature.properties.featureId)
        ),
        paths,
        pointCount: paths.reduce((sum, path) => sum + path.length, 0),
        from:
          tags?.from ??
          firstStop ??
          nearestStopName(firstPoint, stopsFile?.stops ?? []) ??
          fallbackCoordinateLabel(firstPoint),
        to:
          tags?.to ??
          lastStop ??
          nearestStopName(lastPoint, stopsFile?.stops ?? []) ??
          fallbackCoordinateLabel(lastPoint),
        ...(tags?.name ? { name: tags.name } : {}),
        ...(tags?.direction ? { direction: tags.direction } : {}),
        ...(tags?.service ? { service: tags.service } : {}),
        ...(group.relation ? { relation: group.relation } : {}),
      }
    })
    .sort((left, right) => left.relationId - right.relationId)
}

const reciprocalPairStats = (variants: readonly OsmVariantSummary[]) => {
  const oriented = new Map<string, number>()
  for (const variant of variants) {
    const from = normalisePatternStationName(variant.from)
    const to = normalisePatternStationName(variant.to)
    const key = `${from}\0${to}`
    oriented.set(key, (oriented.get(key) ?? 0) + 1)
  }
  const visited = new Set<string>()
  let pairCount = 0
  for (const [key, count] of oriented) {
    if (visited.has(key)) continue
    const [from, to] = key.split("\0")
    const reverseKey = `${to}\0${from}`
    pairCount += Math.min(count, oriented.get(reverseKey) ?? 0)
    visited.add(key)
    visited.add(reverseKey)
  }
  return {
    pairCount,
    unpairedCount: Math.max(0, variants.length - pairCount * 2),
  }
}

const RelationMiniMap = ({
  variant,
  color,
}: {
  variant: OsmVariantSummary
  color: string
}) => (
  <svg
    viewBox={`0 0 ${MINI_MAP_WIDTH} ${MINI_MAP_HEIGHT}`}
    className="h-24 w-36 rounded border border-border bg-muted/20"
    role="img"
    aria-label={`${variant.from} to ${variant.to} route geometry`}
  >
    {variant.paths.map((path, index) => (
      <path
        key={variant.featureIds[index] ?? index}
        d={miniPath(path)}
        fill="none"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ))}
  </svg>
)

type TflPatternRow =
  | { kind: "pair"; id: string; outbound: ServicePatternEvidence; inbound: ServicePatternEvidence }
  | { kind: "single"; id: string; pattern: ServicePatternEvidence }

const sequenceWidth = (stationCount: number): number =>
  Math.max(180, (stationCount - 1) * 14 + 12)

const stationDotX = (
  index: number,
  stationCount: number,
  width: number
): number =>
  stationCount === 1
    ? width / 2
    : 6 + (index / (stationCount - 1)) * (width - 12)

const tflPatternRows = (
  dataset: ServicePatternDataset | null
): TflPatternRow[] => {
  if (!dataset) return []
  const byId = new Map(
    dataset.patterns.map((pattern) => [pattern.id, pattern])
  )
  return dataset.directionPairs.flatMap((pair): TflPatternRow[] => {
    const patterns = pair.patternIds.flatMap((patternId) => {
      const pattern = byId.get(patternId)
      return pattern ? [pattern] : []
    })
    if (patterns.length === 0) return []
    if (!pair.paired || patterns.length < 2) {
      return patterns.map((pattern) => ({
        kind: "single" as const,
        id: pattern.id,
        pattern,
      }))
    }
    const outbound =
      patterns.find((pattern) => pattern.direction === "outbound") ??
      patterns[0]!
    const inbound =
      patterns.find((pattern) => pattern.direction === "inbound") ??
      patterns.find((pattern) => pattern.id !== outbound.id) ??
      patterns[1]!
    return [{ kind: "pair" as const, id: pair.id, outbound, inbound }]
  })
}

const StopSequence = ({
  patterns,
  color,
}: {
  patterns: readonly ServicePatternEvidence[]
  color: string
}) => {
  const primary = patterns[0]
  if (!primary) return null
  const width = sequenceWidth(primary.stationIds.length)
  const laneCount = patterns.length
  const height = laneCount === 1 ? 18 : 28
  const indexByStationId = new Map(
    primary.stationIds.map((stationId, index) => [stationId, index])
  )
  const ariaLabel = patterns
    .map(
      (pattern) =>
        `${pattern.direction} ${pattern.name}, ${pattern.stationIds.length} station calls`
    )
    .join("; ")

  return (
    <div className="min-w-0 space-y-1">
      <div className="flex justify-between gap-3 text-[11px] text-muted-foreground">
        <span>{primary.stationNames[0]}</span>
        <span className="text-right">
          {primary.stationNames[primary.stationNames.length - 1]}
        </span>
      </div>
      <div className="overflow-x-auto pb-1">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ minWidth: width }}
          className={laneCount === 1 ? "h-[18px]" : "h-7"}
          role="img"
          aria-label={ariaLabel}
        >
          {patterns.map((pattern, lane) => {
            const y = laneCount === 1 ? 9 : 7 + lane * 14
            return (
              <g key={pattern.id}>
                <line
                  x1="6"
                  y1={y}
                  x2={width - 6}
                  y2={y}
                  stroke={color}
                  strokeWidth="2.4"
                  strokeLinecap="round"
                />
                {pattern.stationIds.map((stationId, index) => {
                  const alignedIndex =
                    lane === 0
                      ? index
                      : (indexByStationId.get(stationId) ?? index)
                  return (
                    <circle
                      key={`${pattern.id}-${stationId}-${index}`}
                      cx={stationDotX(
                        alignedIndex,
                        primary.stationIds.length,
                        width
                      )}
                      cy={y}
                      r="2.7"
                      fill="var(--background)"
                      stroke={color}
                      strokeWidth="1.5"
                    >
                      <title>{pattern.stationNames[index]}</title>
                    </circle>
                  )
                })}
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

const stateClass = (state: "present" | "partial" | "missing") =>
  state === "present"
    ? "bg-emerald-500/12 text-emerald-800 dark:text-emerald-300"
    : state === "partial"
      ? "bg-amber-500/12 text-amber-800 dark:text-amber-300"
      : "bg-destructive/10 text-destructive"

export const RoutePatternInspector = ({
  lineId,
  lineName,
  color,
  variantsBundle,
  stopsFile,
  dataset,
  snapshot,
}: {
  lineId: string
  lineName: string
  color: string
  variantsBundle: TransitGeometryBundle | undefined
  stopsFile: OsmRouteStopsFile | undefined
  dataset: ServicePatternDataset | null
  snapshot: LineNetworkSlice | null
}) => {
  const osmVariants = osmVariantSummaries(variantsBundle, lineId, stopsFile)
  const pairStats = reciprocalPairStats(osmVariants)
  const tflPaired =
    dataset?.directionPairs.filter((pair) => pair.paired).length ?? 0
  const tflUnpaired =
    dataset?.directionPairs.filter((pair) => !pair.paired).length ?? 0
  const relationData = osmVariants.flatMap((variant) =>
    variant.relation ? [variant.relation] : []
  )
  const crossSourceMatches = matchExternalStopPatterns(
    dataset,
    osmVariants.flatMap((variant) => {
      const relationStops = variant.relation?.stops
      if (!relationStops?.length || relationStops.some((stop) => !stop.name)) {
        return []
      }
      return [
        {
          id: `osm:${variant.relationId}`,
          stopNames: relationStops.map((stop) => stop.name!),
        },
      ]
    })
  )
  const matchByRelationId = new Map(
    crossSourceMatches.map((match) => [
      Number(match.externalPatternId.replace("osm:", "")),
      match,
    ])
  )
  const exactMatchCount = crossSourceMatches.filter(
    (match) => match.kind === "exact"
  ).length
  const limitedStopMatchCount = crossSourceMatches.filter(
    (match) => match.kind === "limited-stop"
  ).length
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div>
          <h3 className="text-base font-medium">Source record counts</h3>
          <p className="max-w-3xl text-xs text-muted-foreground">
            Counts are source records. Reciprocal pairs are exact reversals on
            TfL and matching endpoint directions on OSM.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-border p-3">
            <p className="text-2xl">{snapshot?.patterns.length ?? 0}</p>
            <p className="text-xs text-muted-foreground">
              Inspect snapshot patterns
            </p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-2xl">{dataset?.patterns.length ?? 0}</p>
            <p className="text-xs text-muted-foreground">TfL ordered routes</p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-2xl">
              {tflPaired}{" "}
              <span className="text-sm text-muted-foreground">
                + {tflUnpaired}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              TfL reciprocal pairs + unpaired records
            </p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-2xl">{osmVariants.length}</p>
            <p className="text-xs text-muted-foreground">OSM route relations</p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-2xl">
              {pairStats.pairCount}{" "}
              <span className="text-sm text-muted-foreground">
                + {pairStats.unpairedCount}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              OSM reciprocal pairs + unpaired records
            </p>
          </div>
          <div className="rounded-lg border border-border p-3 sm:col-span-2 lg:col-span-4">
            <p className="text-sm font-medium">Name-sequence comparison</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {exactMatchCount} OSM relations have the same calls as a complete
              or contained TfL path. {limitedStopMatchCount} match a TfL path
              after omitting calls.{" "}
              {osmVariants.length - crossSourceMatches.length} have no safe
              name-sequence match.
            </p>
          </div>
        </div>
      </section>

      {snapshot && (
        <section className="space-y-2">
          <div>
            <h3 className="text-base font-medium">Inspect snapshot patterns</h3>
            <p className="text-xs text-muted-foreground">
              Collapsed call sequences from the optional timetable snapshot.
              Not an input to the four maps.
            </p>
          </div>
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="max-h-[42rem] divide-y divide-border overflow-y-auto">
              {snapshot.patterns.map((pattern) => {
                const calendar = snapshot.calendars.find(
                  (row) => row.patternId === pattern.id
                )
                const peak = snapshot.frequencies.find(
                  (row) =>
                    row.patternId === pattern.id &&
                    row.timeWindow.startsWith("weekday 07:00")
                )
                const evidence = {
                  id: pattern.id,
                  source: "tfl-static-sequence" as const,
                  name: patternLabel(pattern, snapshot.stations),
                  direction: pattern.direction,
                  serviceType: calendar
                    ? formatDaysOfWeek(calendar.daysOfWeek)
                    : "unknown days",
                  stationIds: pattern.callIds,
                  stationNames: pattern.callIds.map((stationId) => {
                    const station = snapshot.stations.find(
                      (entry) => entry.id === stationId
                    )
                    return station?.name ?? stationId
                  }),
                }
                return (
                  <details key={pattern.id} className="group px-3 py-2">
                    <summary className="grid cursor-pointer list-none gap-2 sm:grid-cols-[minmax(12rem,0.8fr)_minmax(18rem,1.2fr)_auto] sm:items-center">
                      <div>
                        <p className="text-xs font-medium">{evidence.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {pattern.direction} · {evidence.serviceType} ·{" "}
                          {pattern.callIds.length} calls
                          {peak?.headwaySeconds
                            ? ` · weekday am ${formatHeadway(peak.headwaySeconds)}`
                            : ""}
                        </p>
                      </div>
                      <StopSequence patterns={[evidence]} color={color} />
                      <span className="text-[11px] text-muted-foreground group-open:hidden">
                        raw
                      </span>
                    </summary>
                    <pre className="mt-2 max-h-52 overflow-auto rounded-md bg-muted/40 p-2 text-[10px] leading-relaxed">
                      {JSON.stringify(
                        {
                          pattern,
                          calendar,
                          frequencies: snapshot.frequencies.filter(
                            (row) => row.patternId === pattern.id
                          ),
                          pathMatch: snapshot.pathMatches.find(
                            (row) => row.patternId === pattern.id
                          ),
                        },
                        null,
                        2
                      )}
                    </pre>
                  </details>
                )
              })}
            </div>
          </div>
        </section>
      )}

      <section className="space-y-2">
        <div>
          <h3 className="text-base font-medium">TfL ordered routes</h3>
          <p className="text-xs text-muted-foreground">
            Reciprocal inbound and outbound sequences share a row.
          </p>
        </div>
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="max-h-[42rem] divide-y divide-border overflow-y-auto">
            {tflPatternRows(dataset).map((row) => {
              const patterns =
                row.kind === "pair"
                  ? [row.outbound, row.inbound]
                  : [row.pattern]
              const title = patterns[0]!.name
              const directions = patterns
                .map((pattern) => pattern.direction)
                .join(" / ")
              const serviceTypes = [
                ...new Set(patterns.map((pattern) => pattern.serviceType)),
              ].join(" / ")
              return (
                <details key={row.id} className="group px-3 py-2">
                  <summary className="grid cursor-pointer list-none gap-2 sm:grid-cols-[minmax(12rem,0.8fr)_minmax(18rem,1.2fr)_auto] sm:items-center">
                    <div>
                      <p className="text-xs font-medium">{title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {directions} · {serviceTypes} ·{" "}
                        {patterns[0]!.stationIds.length} calls
                      </p>
                    </div>
                    <StopSequence patterns={patterns} color={color} />
                    <span className="text-[11px] text-muted-foreground group-open:hidden">
                      raw
                    </span>
                  </summary>
                  <pre className="mt-2 max-h-52 overflow-auto rounded-md bg-muted/40 p-2 text-[10px] leading-relaxed">
                    {JSON.stringify(
                      row.kind === "pair"
                        ? { outbound: row.outbound, inbound: row.inbound }
                        : row.pattern,
                      null,
                      2
                    )}
                  </pre>
                </details>
              )
            })}
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <div>
          <h3 className="text-base font-medium">OSM route relations</h3>
          <p className="text-xs text-muted-foreground">
            Every thumbnail uses the same Greater London frame, at 3:2, so
            branches stay comparable and unskewed.
          </p>
        </div>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[820px] text-left text-xs">
            <thead className="border-b border-border bg-muted/30 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Shape</th>
                <th className="px-3 py-2 font-medium">Relation</th>
                <th className="px-3 py-2 font-medium">From</th>
                <th className="px-3 py-2 font-medium">To</th>
                <th className="px-3 py-2 font-medium">Stops</th>
                <th className="px-3 py-2 font-medium">TfL comparison</th>
                <th className="px-3 py-2 font-medium">Points</th>
                <th className="px-3 py-2 font-medium">Raw</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {osmVariants.map((variant) => {
                const match = matchByRelationId.get(variant.relationId)
                return (
                  <tr key={variant.relationId} className="align-middle">
                    <td className="px-3 py-2">
                      <RelationMiniMap
                        variant={variant}
                        color={color}
                      />
                    </td>
                    <td className="px-3 py-2 font-mono">
                      <a
                        href={`https://www.openstreetmap.org/relation/${variant.relationId}`}
                        className="underline underline-offset-2"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {variant.relationId}
                      </a>
                    </td>
                    <td className="px-3 py-2">{variant.from}</td>
                    <td className="px-3 py-2">{variant.to}</td>
                    <td className="px-3 py-2">
                      <details>
                        <summary className="cursor-pointer">
                          {variant.relation?.stops.length ?? "not cached"}
                        </summary>
                        {variant.relation && (
                          <p className="mt-2 w-80 text-[11px] leading-relaxed text-muted-foreground">
                            {variant.relation.stops
                              .map((stop) => stop.name ?? String(stop.nodeId))
                              .join(" → ")}
                          </p>
                        )}
                      </details>
                    </td>
                    <td className="px-3 py-2">
                      {match ? (
                        <div className="w-52">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[11px] ${stateClass(
                              match.kind === "exact" ? "present" : "partial"
                            )}`}
                          >
                            {match.kind === "exact"
                              ? "same calls"
                              : `skips ${match.omittedStationNames.length}`}
                          </span>
                          {match.omittedStationNames.length > 0 && (
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              {match.omittedStationNames.join(", ")}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">
                          no name-sequence match
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">{variant.pointCount}</td>
                    <td className="px-3 py-2">
                      <details>
                        <summary className="cursor-pointer text-muted-foreground">
                          inspect
                        </summary>
                        <pre className="mt-2 max-h-64 w-[28rem] overflow-auto rounded-md bg-muted/40 p-2 text-[10px] leading-relaxed">
                          {JSON.stringify(
                            {
                              relationId: variant.relationId,
                              featureIds: variant.featureIds,
                              pointCount: variant.pointCount,
                              tags: variant.relation?.tags ?? null,
                              stops: variant.relation?.stops ?? null,
                            },
                            null,
                            2
                          )}
                        </pre>
                      </details>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-base font-medium">Data sufficiency</h3>
        <div className="grid gap-2 md:grid-cols-2">
          <div className="rounded-lg border border-border p-3">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium">OSM relation membership</p>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${stateClass(
                  relationData.length === osmVariants.length &&
                    osmVariants.length > 0
                    ? "present"
                    : "partial"
                )}`}
              >
                {relationData.length === osmVariants.length &&
                osmVariants.length > 0
                  ? "present"
                  : "partial"}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {relationData.length} of {osmVariants.length} route relations have
              cached tags and ordered stop members. The geographic map joins a
              pattern to track by these members.
            </p>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Source: OSM public_transport route relations
            </p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium">Cross-source stop matching</p>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${stateClass(
                  crossSourceMatches.length === osmVariants.length &&
                    osmVariants.length > 0
                    ? "present"
                    : "partial"
                )}`}
              >
                {crossSourceMatches.length === osmVariants.length &&
                osmVariants.length > 0
                  ? "present"
                  : "partial"}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {crossSourceMatches.length} of {osmVariants.length} OSM stop
              sequences fit a contiguous TfL path. This is normalised name
              matching, not an authored NaPTAN-to-OSM identity link.
            </p>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Source: derived from both pattern sets
            </p>
          </div>
          {(dataset?.fields ?? []).map((field) => (
            <div
              key={field.field}
              className="rounded-lg border border-border p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium">{field.field}</p>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${stateClass(field.state)}`}
                >
                  {field.state}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{field.note}</p>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Source: {field.source}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-base font-medium">Whole derived records</h3>
        <div className="grid gap-3 lg:grid-cols-2">
          <details className="rounded-lg border border-border p-3">
            <summary className="cursor-pointer text-sm font-medium">
              Inspect snapshot slice for {lineName}
            </summary>
            <pre className="mt-3 max-h-[36rem] overflow-auto rounded-md bg-muted/40 p-2 text-[10px] leading-relaxed">
              {JSON.stringify(snapshot, null, 2)}
            </pre>
          </details>
          <details className="rounded-lg border border-border p-3">
            <summary className="cursor-pointer text-sm font-medium">
              TfL service-pattern dataset for {lineName}
            </summary>
            <pre className="mt-3 max-h-[36rem] overflow-auto rounded-md bg-muted/40 p-2 text-[10px] leading-relaxed">
              {JSON.stringify(dataset, null, 2)}
            </pre>
          </details>
          <details className="rounded-lg border border-border p-3">
            <summary className="cursor-pointer text-sm font-medium">
              OSM relation metadata for {lineName}
            </summary>
            <pre className="mt-3 max-h-[36rem] overflow-auto rounded-md bg-muted/40 p-2 text-[10px] leading-relaxed">
              {JSON.stringify(relationData, null, 2)}
            </pre>
          </details>
        </div>
      </section>
    </div>
  )
}
