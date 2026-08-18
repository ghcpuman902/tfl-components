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

type Bounds = {
  minLng: number
  maxLng: number
  minLat: number
  maxLat: number
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

const boundsFor = (variants: readonly OsmVariantSummary[]): Bounds | null => {
  let minLng = Number.POSITIVE_INFINITY
  let maxLng = Number.NEGATIVE_INFINITY
  let minLat = Number.POSITIVE_INFINITY
  let maxLat = Number.NEGATIVE_INFINITY
  for (const variant of variants) {
    for (const path of variant.paths) {
      for (const point of path) {
        minLng = Math.min(minLng, point[0])
        maxLng = Math.max(maxLng, point[0])
        minLat = Math.min(minLat, point[1])
        maxLat = Math.max(maxLat, point[1])
      }
    }
  }
  return Number.isFinite(minLng) ? { minLng, maxLng, minLat, maxLat } : null
}

const miniPath = (path: readonly LngLat[], bounds: Bounds): string => {
  const width = Math.max(bounds.maxLng - bounds.minLng, 0.000001)
  const height = Math.max(bounds.maxLat - bounds.minLat, 0.000001)
  return path
    .map((point, index) => {
      const x = 4 + ((point[0] - bounds.minLng) / width) * 132
      const y = 44 - ((point[1] - bounds.minLat) / height) * 40
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(" ")
}

const RelationMiniMap = ({
  variant,
  bounds,
  color,
}: {
  variant: OsmVariantSummary
  bounds: Bounds | null
  color: string
}) => (
  <svg
    viewBox="0 0 140 48"
    className="h-12 w-36 rounded border border-border bg-muted/20"
    role="img"
    aria-label={`${variant.from} to ${variant.to} route geometry`}
  >
    {bounds &&
      variant.paths.map((path, index) => (
        <path
          key={variant.featureIds[index] ?? index}
          d={miniPath(path, bounds)}
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
  return dataset.directionPairs.flatMap((pair) => {
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

const GtfsLens = ({
  dataset,
  snapshot,
}: {
  dataset: ServicePatternDataset | null
  snapshot: LineNetworkSlice | null
}) => {
  const snapshotShapes = snapshot?.paths.length ?? 0
  const rows = [
    {
      gtfs: "routes.txt",
      concept: "A public-facing line",
      here: snapshot?.line.shortName ?? dataset?.lineName ?? "No line row",
      state: snapshot || dataset ? ("present" as const) : ("missing" as const),
    },
    {
      gtfs: "trips.txt",
      concept: "One dated vehicle run",
      here: snapshot
        ? "Dated trips were collapsed into unique call sequences. Individual trip ids are not kept."
        : "Not stored. An ordered route is a pattern, not proof of a particular train.",
      state: snapshot ? ("partial" as const) : ("missing" as const),
    },
    {
      gtfs: "stop_times.txt",
      concept: "Ordered calls with times",
      here: snapshot
        ? "Call order is stored. Clock times were used only to derive headway bands."
        : dataset
          ? "Call order is present; arrival, departure, pickup, and drop-off times are absent."
          : "Missing",
      state: snapshot || dataset ? ("partial" as const) : ("missing" as const),
    },
    {
      gtfs: "stops.txt",
      concept: "Stop and platform identity",
      here: snapshot
        ? `${snapshot.stations.length} stops used by this line, grouped to GTFS parents where present.`
        : "TfL NaPTAN ids and OSM stop nodes exist, but their one-to-one match is incomplete.",
      state: snapshot ? ("present" as const) : ("partial" as const),
    },
    {
      gtfs: "shapes.txt",
      concept: "The path followed by a trip",
      here: snapshotShapes
        ? `${snapshotShapes} low-resolution Elizabeth / Overground shapes, one most-common path per pattern.`
        : snapshot
          ? "This line has no timetable shapes. OSM unique-track remains the map paint."
          : "OSM route geometry exists. It is not yet matched one-to-one with each TfL pattern.",
      state: snapshotShapes
        ? ("present" as const)
        : snapshot
          ? ("missing" as const)
          : ("partial" as const),
    },
    {
      gtfs: "calendar.txt / calendar_dates.txt",
      concept: "Days and exceptions",
      here: snapshot
        ? `${snapshot.calendars.length} typical day-class rows (weekday / Saturday / Sunday). Dated exceptions were not kept.`
        : "Missing",
      state: snapshot ? ("present" as const) : ("missing" as const),
    },
    {
      gtfs: "frequencies.txt or stop times",
      concept: "How often the pattern runs",
      here: snapshot
        ? `${snapshot.frequencies.length} headway bands from first-stop times.`
        : "Missing",
      state: snapshot ? ("present" as const) : ("missing" as const),
    },
    {
      gtfs: "route_patterns extension",
      concept: "Reusable trip pattern and typicality",
      here: snapshot
        ? `${snapshot.patterns.length} collapsed timetable patterns.`
        : dataset
          ? `${dataset.patterns.length} ordered routes resemble patterns; canonical and typicality fields are missing.`
          : "Missing",
      state: snapshot
        ? ("present" as const)
        : dataset
          ? ("partial" as const)
          : ("missing" as const),
    },
  ]

  return (
    <section className="space-y-2">
      <div>
        <h3 className="text-base font-medium">GTFS lens</h3>
        <p className="text-xs text-muted-foreground">
          Conceptual crosswalk to the derived timetable snapshot, not a full
          GTFS extract.
        </p>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[760px] text-left text-xs">
          <thead className="border-b border-border bg-muted/30 text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">GTFS table or extension</th>
              <th className="px-3 py-2 font-medium">Meaning</th>
              <th className="px-3 py-2 font-medium">What this repo has</th>
              <th className="px-3 py-2 font-medium">State</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={row.gtfs}>
                <td className="px-3 py-2 font-mono">{row.gtfs}</td>
                <td className="px-3 py-2">{row.concept}</td>
                <td className="max-w-lg px-3 py-2 text-muted-foreground">
                  {row.here}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 ${stateClass(row.state)}`}
                  >
                    {row.state}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

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
  const bounds = boundsFor(osmVariants)
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
  const osmScheduleTags = [
    "opening_hours",
    "interval",
    "frequency",
    "service_times",
  ]
  const relationsWithScheduleTags = relationData.filter((relation) =>
    osmScheduleTags.some((tag) => relation.tags[tag])
  ).length

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div>
          <h3 className="text-base font-medium">Source record counts</h3>
          <p className="max-w-3xl text-xs text-muted-foreground">
            These counts describe source records, not trains per hour.
            Reciprocal pairs are exact reversals for TfL and matching endpoint
            directions for OSM.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-border p-3">
            <p className="text-2xl">{snapshot?.patterns.length ?? 0}</p>
            <p className="text-xs text-muted-foreground">
              Timetable snapshot patterns
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
            <h3 className="text-base font-medium">Timetable snapshot patterns</h3>
            <p className="text-xs text-muted-foreground">
              Collapsed Aubin sequences with typical days and peak-ish headways.
              Hover a dot for its station name.
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
            Reciprocal inbound and outbound sequences share a row as two
            tracks. Hover a dot for its station name.
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
            Every thumbnail uses the same geographic bounds, so branch and
            terminal differences remain comparable. Relation stop order and tags
            appear when the version 2 cache is available.
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
                        bounds={bounds}
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

      <GtfsLens dataset={dataset} snapshot={snapshot} />

      <section className="space-y-2">
        <h3 className="text-base font-medium">Data sufficiency</h3>
        <div className="grid gap-2 md:grid-cols-2">
          <div className="rounded-lg border border-border p-3">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium">OSM relation membership</p>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${stateClass(
                  relationData.length === osmVariants.length
                    ? "present"
                    : "partial"
                )}`}
              >
                {relationData.length === osmVariants.length
                  ? "present"
                  : "partial"}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {relationData.length} of {osmVariants.length} route relations have
              cached tags and ordered stop members.
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
                  crossSourceMatches.length === osmVariants.length
                    ? "present"
                    : "partial"
                )}`}
              >
                {crossSourceMatches.length === osmVariants.length
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
          <div className="rounded-lg border border-border p-3">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium">OSM service schedule</p>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${stateClass(
                  relationsWithScheduleTags > 0 ? "partial" : "missing"
                )}`}
              >
                {relationsWithScheduleTags > 0 ? "partial" : "missing"}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {relationsWithScheduleTags} of {relationData.length} cached
              relations have an opening-hours, interval, frequency, or
              service-times tag. Bicycle restrictions are not train operating
              times.
            </p>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Source: cached OSM relation tags
            </p>
          </div>
          {(dataset?.fields ?? [])
            .filter((field) => {
              if (!snapshot) return true
              return (
                field.field !== "Calendar and time windows" &&
                field.field !== "Frequency and typicality"
              )
            })
            .map((field) => (
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
              Timetable snapshot slice for {lineName}
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
