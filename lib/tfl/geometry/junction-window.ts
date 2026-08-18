/**
 * Build one real junction window: cropped dual-track geography, contracted
 * dual graph, and permitted-route constraints from OSM relations + TfL
 * station sequences.
 */
import type { Feature, LineString } from "geojson"
import type {
  LineSegmentProperties,
  TransitGeometryBundle,
  TransitMode,
} from "@/lib/tfl/geography-types"
import { contractTrackTopology } from "@/lib/tfl/geometry/contract-track-topology"
import type { ContractedTopology } from "@/lib/tfl/geometry/contract-track-topology"
import {
  boundsAround,
  cropBundleToBounds,
  neighborhoodTopology,
  nodesMatchingStation,
  pointInBounds,
  type LonLatBounds,
} from "@/lib/tfl/geometry/crop-track-window"
import type { JunctionCase } from "@/lib/tfl/geometry/junction-cases"
import {
  movementPairs,
  osmMovementsForTopology,
  tflMovementsForTopology,
  type TopologyMovementPair,
} from "@/lib/tfl/geometry/topology-movements"
import type {
  LngLat,
  TrackStation,
} from "@/lib/tfl/geometry/transit-track-graph"
import { servicePatternEvidenceForLine } from "@/lib/tfl/service-pattern-evidence"

export type BundlesByMode = Partial<Record<TransitMode, TransitGeometryBundle>>

export type JunctionWindow = {
  case: JunctionCase
  bounds: LonLatBounds
  croppedDual: TransitGeometryBundle
  topology: ContractedTopology
  movements: TopologyMovementPair[]
  colorByFeatureId: Record<string, string>
  color: string
  lineName: string
}

const featuresForLines = (
  bundle: TransitGeometryBundle | undefined,
  lineIds: readonly string[]
): Feature<LineString, LineSegmentProperties>[] => {
  if (!bundle) return []
  const allow = new Set(lineIds)
  return (bundle.lines.features ?? []).filter(
    (feature) =>
      feature.geometry?.type === "LineString" &&
      allow.has(feature.properties.lineId)
  )
}

const stationsFromBundle = (
  bundle: TransitGeometryBundle | undefined,
  lineIds: readonly string[]
): TrackStation[] => {
  if (!bundle) return []
  const allow = new Set(lineIds)
  return (bundle.stations.features ?? []).flatMap((feature) => {
    if (feature.geometry?.type !== "Point") return []
    if (!feature.properties.lineIds.some((lineId) => allow.has(lineId))) {
      return []
    }
    const coords = feature.geometry.coordinates
    if (coords.length < 2) return []
    return [
      {
        id: String(feature.id ?? feature.properties.featureId),
        name: feature.properties.name,
        label: feature.properties.label,
        coordinates: [coords[0]!, coords[1]!] as LngLat,
      },
    ]
  })
}

export const buildJunctionWindow = (
  junctionCase: JunctionCase,
  dual: BundlesByMode,
  centreline: BundlesByMode,
  variants: BundlesByMode
): JunctionWindow | null => {
  const dualBundle = dual[junctionCase.mode]
  const centrelineBundle = centreline[junctionCase.mode]
  const variantBundle = variants[junctionCase.mode]
  const lineFeatures = featuresForLines(dualBundle, junctionCase.lineIds)
  const stations = stationsFromBundle(
    centrelineBundle ?? dualBundle,
    junctionCase.lineIds
  )
  if (lineFeatures.length === 0 || stations.length === 0) return null

  const fullTopology = contractTrackTopology(lineFeatures, stations)
  const seeds = nodesMatchingStation(fullTopology, junctionCase.stationLabel)
  if (seeds.length === 0) return null

  const bounds = boundsAround(
    seeds.map((node) => node.coordinates),
    junctionCase.radiusM
  )
  if (!bounds) return null
  const insideIds = fullTopology.nodes
    .filter((node) => pointInBounds(node.coordinates, bounds))
    .map((node) => node.id)
  const topology = neighborhoodTopology(
    fullTopology,
    [...new Set([...seeds.map((node) => node.id), ...insideIds])],
    junctionCase.hops
  )

  const emptyBundle: TransitGeometryBundle = {
    lines: { type: "FeatureCollection", features: [] },
    stations: { type: "FeatureCollection", features: [] },
  }
  const croppedDual = cropBundleToBounds(
    dualBundle ?? emptyBundle,
    bounds,
    junctionCase.lineIds
  )
  if (croppedDual.lines.features.length === 0) return null

  const variantFeatures = featuresForLines(variantBundle, junctionCase.lineIds)
  const tflMovements = junctionCase.lineIds.flatMap((lineId) =>
    tflMovementsForTopology(topology, servicePatternEvidenceForLine(lineId))
  )
  const movements = movementPairs([
    ...osmMovementsForTopology(topology, variantFeatures),
    ...tflMovements,
  ])

  const colorByFeatureId: Record<string, string> = {}
  for (const feature of lineFeatures) {
    colorByFeatureId[feature.properties.featureId] = feature.properties.color
  }
  const first = lineFeatures[0]!

  return {
    case: junctionCase,
    bounds,
    croppedDual,
    topology,
    movements,
    colorByFeatureId,
    color: first.properties.color,
    lineName: first.properties.lineName,
  }
}
