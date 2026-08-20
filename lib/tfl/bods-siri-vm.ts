import { XMLParser } from "fast-xml-parser"
import type { BusRouteGeometry } from "@/lib/tfl/bus-geography-types"
import type { VehiclePosition } from "@/lib/tfl/map-vehicles"

/** TfL’s National Operator Code on BODS. */
export const TFLO_OPERATOR_REF = "TFLO"

export const BODS_DATAFEED_URL =
  "https://data.bus-data.dft.gov.uk/api/v1/datafeed/"

/** Drop GPS older than this — BODS keeps stale VehicleActivity rows. */
export const BODS_STALE_MS = 180_000

const BBOX_PAD_DEG = 0.01

export type BodsVehicleActivity = {
  vehicleRef: string
  lineRef: string
  publishedLineName: string
  destinationName: string
  recordedAtTime: string
  latitude: number
  longitude: number
  bearing?: number
}

export type BusPositionSource = "auto" | "gps" | "dead-reckoning"

export type BodsBoundingBox = readonly [number, number, number, number]

export const isBodsConfigured = (): boolean =>
  Boolean(process.env.BODS_API_KEY?.trim())

export const resolveBusPositionSource = (
  requested: BusPositionSource,
  bodsConfigured: boolean
): "gps" | "dead-reckoning" => {
  if (requested === "dead-reckoning") return "dead-reckoning"
  if (requested === "gps") return bodsConfigured ? "gps" : "dead-reckoning"
  return bodsConfigured ? "gps" : "dead-reckoning"
}

export const matchBodsLine = (
  activity: BodsVehicleActivity,
  routeId: string
): boolean => {
  const want = routeId.trim().toLowerCase()
  if (!want) return false
  return (
    activity.publishedLineName.trim().toLowerCase() === want ||
    activity.lineRef.trim().toLowerCase() === want
  )
}

export const boundingBoxFromGeometries = (
  geometries: readonly BusRouteGeometry[],
  padDeg = BBOX_PAD_DEG
): BodsBoundingBox | null => {
  let minLon = Infinity
  let minLat = Infinity
  let maxLon = -Infinity
  let maxLat = -Infinity
  const consider = (lon: number, lat: number) => {
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) return
    minLon = Math.min(minLon, lon)
    minLat = Math.min(minLat, lat)
    maxLon = Math.max(maxLon, lon)
    maxLat = Math.max(maxLat, lat)
  }
  for (const geometry of geometries) {
    for (const stop of geometry.stops) consider(stop.lon, stop.lat)
    for (const segment of geometry.segments) {
      for (const coord of segment.line.coordinates) {
        consider(coord[0], coord[1])
      }
    }
  }
  if (!Number.isFinite(minLon)) return null
  return [minLon - padDeg, minLat - padDeg, maxLon + padDeg, maxLat + padDeg]
}

export const buildBodsDatafeedUrl = ({
  apiKey,
  boundingBox,
  operatorRef = TFLO_OPERATOR_REF,
}: {
  apiKey: string
  boundingBox?: BodsBoundingBox
  operatorRef?: string
}): URL => {
  const url = new URL(BODS_DATAFEED_URL)
  url.searchParams.set("api_key", apiKey)
  if (operatorRef) url.searchParams.set("operatorRef", operatorRef)
  if (boundingBox) {
    url.searchParams.set(
      "boundingBox",
      boundingBox.map((value) => value.toFixed(6)).join(",")
    )
  }
  return url
}

export const bodsActivitiesToVehicles = (
  activities: readonly BodsVehicleActivity[],
  routeIds: readonly string[],
  asOf: number
): VehiclePosition[] => {
  const routes = routeIds.map((id) => id.trim()).filter(Boolean)
  const out: VehiclePosition[] = []
  for (const activity of activities) {
    const recorded = Date.parse(activity.recordedAtTime)
    if (Number.isFinite(recorded) && asOf - recorded > BODS_STALE_MS) continue
    const lineId = routes.find((id) => matchBodsLine(activity, id))
    if (!lineId) continue
    out.push({
      vehicleId: activity.vehicleRef,
      lineId,
      lat: activity.latitude,
      lon: activity.longitude,
      bearingDeg: activity.bearing ?? 0,
      destinationName: activity.destinationName,
      timeToNextStationSec: 0,
      asOf: Number.isFinite(recorded) ? recorded : asOf,
    })
  }
  return out
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null

const textOf = (value: unknown): string => {
  if (typeof value === "string") return value
  if (typeof value === "number") return String(value)
  const record = asRecord(value)
  if (record && typeof record["#text"] === "string") return record["#text"]
  return ""
}

const asList = (value: unknown): unknown[] => {
  if (value == null) return []
  return Array.isArray(value) ? value : [value]
}

const parseActivity = (raw: unknown): BodsVehicleActivity | null => {
  const activity = asRecord(raw)
  if (!activity) return null
  const journey = asRecord(activity.MonitoredVehicleJourney)
  if (!journey) return null
  const location = asRecord(journey.VehicleLocation)
  const latitude = Number(textOf(location?.Latitude))
  const longitude = Number(textOf(location?.Longitude))
  const vehicleRef = textOf(journey.VehicleRef).trim()
  const lineRef = textOf(journey.LineRef).trim()
  const publishedLineName = textOf(journey.PublishedLineName).trim() || lineRef
  if (
    !vehicleRef ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return null
  }
  const bearingRaw = textOf(journey.Bearing)
  const bearing = bearingRaw ? Number(bearingRaw) : undefined
  return {
    vehicleRef,
    lineRef,
    publishedLineName,
    destinationName: textOf(journey.DestinationName).trim(),
    recordedAtTime: textOf(activity.RecordedAtTime),
    latitude,
    longitude,
    bearing: Number.isFinite(bearing) ? bearing : undefined,
  }
}

/**
 * Parse a SIRI-VM document. Accepts the usual BODS wrapping
 * (`Siri > ServiceDelivery > VehicleMonitoringDelivery > VehicleActivity`).
 */
export const parseSiriVm = (xml: string): BodsVehicleActivity[] => {
  const parser = new XMLParser({
    ignoreAttributes: false,
    removeNSPrefix: true,
  })
  const doc = asRecord(parser.parse(xml))
  const siri = asRecord(doc?.Siri) ?? doc
  const delivery = asRecord(siri?.ServiceDelivery)
  const monitoring = asList(delivery?.VehicleMonitoringDelivery)
  const out: BodsVehicleActivity[] = []
  for (const block of monitoring) {
    const record = asRecord(block)
    for (const activity of asList(record?.VehicleActivity)) {
      const parsed = parseActivity(activity)
      if (parsed) out.push(parsed)
    }
  }
  return out
}

export const fetchBodsVehicleActivities = async ({
  apiKey = process.env.BODS_API_KEY ?? "",
  boundingBox,
  operatorRef = TFLO_OPERATOR_REF,
}: {
  apiKey?: string
  boundingBox?: BodsBoundingBox
  operatorRef?: string
} = {}): Promise<BodsVehicleActivity[]> => {
  const key = apiKey.trim()
  if (!key) {
    throw new Error("Missing BODS_API_KEY.")
  }
  const response = await fetch(
    buildBodsDatafeedUrl({ apiKey: key, boundingBox, operatorRef }),
    { cache: "no-store" }
  )
  if (!response.ok) {
    throw new Error(`BODS datafeed failed (${response.status}).`)
  }
  return parseSiriVm(await response.text())
}
