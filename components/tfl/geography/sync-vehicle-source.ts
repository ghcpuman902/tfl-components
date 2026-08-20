"use client"

import { useCallback, useEffect, useRef } from "react"
import type { FeatureCollection, LineString } from "geojson"
import type maplibregl from "maplibre-gl"
import {
  vehiclesToSegmentGeoJSON,
  type VehiclePosition,
  type VehicleSegmentProperties,
} from "@/lib/tfl/map-vehicles"
import { hopGraphForRailLine } from "@/lib/tfl/vehicle-hop-graph"
import { advanceHopPosition } from "@/lib/tfl/vehicle-hop-engine"
import {
  pathTurnBetween,
  positionBehindStop,
  type RoutePolyline,
} from "@/lib/tfl/vehicle-progress"
import {
  DEFAULT_VEHICLE_VISCOSITY,
  stillDwelling,
  viscosityFactor,
} from "@/lib/tfl/vehicle-viscosity"

const COAST_FRAME_MS = 80
const EASE_MS = 1_200
const SNAP_EPSILON_DEG = 0.00004

const setSegmentData = (
  map: maplibregl.Map,
  sourceId: string,
  collection: FeatureCollection<LineString, VehicleSegmentProperties>
) => {
  const source = map.getSource(sourceId)
  if (source?.type === "geojson") {
    ;(source as maplibregl.GeoJSONSource).setData(collection)
  }
}

const vehicleKey = (vehicle: VehiclePosition): string =>
  `${vehicle.lineId}:${vehicle.vehicleId}`

const easeInOut = (t: number): number =>
  t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2

type EaseState = {
  fromLat: number
  fromLon: number
  fromRemainingKm?: number
  fromStopId?: string
  toStopId?: string
  startMs: number
  durationMs: number
}

const easeDurationMs = (
  from: VehiclePosition,
  to: VehiclePosition,
  polylines: readonly RoutePolyline[]
): number => {
  const turn = pathTurnBetween({
    from: { lat: from.lat, lon: from.lon },
    to: { lat: to.lat, lon: to.lon },
    lineId: to.lineId,
    polylines,
    fromStopId: to.fromStopId ?? from.fromStopId,
    toStopId: to.nextStopId ?? from.nextStopId,
    canonical: hopGraphForRailLine(to.lineId).canonical,
  })
  const remainingKm = Math.min(
    from.remainingKm ?? Number.POSITIVE_INFINITY,
    to.remainingKm ?? Number.POSITIVE_INFINITY
  )
  return (
    EASE_MS *
    viscosityFactor({
      turnRadians: turn,
      remainingKm: Number.isFinite(remainingKm) ? remainingKm : undefined,
      params: DEFAULT_VEHICLE_VISCOSITY,
    })
  )
}

const placeAlongHop = (
  vehicle: VehiclePosition,
  remainingKm: number,
  polylines: readonly RoutePolyline[]
): VehiclePosition => {
  if (vehicle.nextStopLat == null || vehicle.nextStopLon == null) {
    return { ...vehicle, remainingKm }
  }
  const followingStop =
    vehicle.followingStopLat != null && vehicle.followingStopLon != null
      ? { lat: vehicle.followingStopLat, lon: vehicle.followingStopLon }
      : undefined
  const placed = positionBehindStop({
    nextStop: { lat: vehicle.nextStopLat, lon: vehicle.nextStopLon },
    followingStop,
    remainingKm,
    lineId: vehicle.lineId,
    polylines,
    fromStopId: vehicle.fromStopId,
    toStopId: vehicle.nextStopId,
    canonical: hopGraphForRailLine(vehicle.lineId).canonical,
  })
  return {
    ...vehicle,
    lat: placed.lat,
    lon: placed.lon,
    bearingDeg: placed.bearingDeg,
    remainingKm,
  }
}

/**
 * Writes vehicle segments onto an existing GeoJSON source.
 * When `coast` is on, walks each vehicle along its hop using elapsed
 * time and eases onto a new poll's committed target — setData only,
 * never recreates the map.
 */
export const useVehicleSegmentSource = ({
  mapRef,
  sourceId,
  vehicles,
  getPolylines,
  coast = false,
  ready,
}: {
  mapRef: { current: maplibregl.Map | null }
  sourceId: string
  vehicles: readonly VehiclePosition[] | undefined
  getPolylines: () => readonly RoutePolyline[]
  coast?: boolean
  ready: boolean
}) => {
  const vehiclesRef = useRef(vehicles)
  const getPolylinesRef = useRef(getPolylines)
  const renderedRef = useRef<Map<string, VehiclePosition>>(new Map())
  const easesRef = useRef<Map<string, EaseState>>(new Map())
  const lastAsOfRef = useRef<number | null>(null)

  useEffect(() => {
    vehiclesRef.current = vehicles
    getPolylinesRef.current = getPolylines
  })

  const write = useCallback(
    (next: readonly VehiclePosition[]) => {
      const map = mapRef.current
      if (!map) return
      setSegmentData(
        map,
        sourceId,
        vehiclesToSegmentGeoJSON(next, getPolylinesRef.current())
      )
      const nextRendered = new Map<string, VehiclePosition>()
      for (const vehicle of next) {
        nextRendered.set(vehicleKey(vehicle), vehicle)
      }
      renderedRef.current = nextRendered
    },
    [mapRef, sourceId]
  )

  const flush = useCallback(() => {
    write(vehiclesRef.current ?? [])
  }, [write])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return

    if (!coast) {
      write(vehicles ?? [])
      return
    }

    let frame = 0
    let last = 0
    const tick = (now: number) => {
      if (now - last >= COAST_FRAME_MS) {
        last = now
        const snapshot = vehiclesRef.current ?? []
        const polylines = getPolylinesRef.current()
        const clock = Date.now()
        const snapshotAsOf = snapshot[0]?.asOf ?? null
        if (snapshotAsOf != null && snapshotAsOf !== lastAsOfRef.current) {
          lastAsOfRef.current = snapshotAsOf
          const eases = easesRef.current
          const nextEases = new Map<string, EaseState>()
          for (const vehicle of snapshot) {
            const key = vehicleKey(vehicle)
            const rendered = renderedRef.current.get(key)
            if (
              rendered &&
              (Math.abs(rendered.lat - vehicle.lat) > SNAP_EPSILON_DEG ||
                Math.abs(rendered.lon - vehicle.lon) > SNAP_EPSILON_DEG)
            ) {
              nextEases.set(key, {
                fromLat: rendered.lat,
                fromLon: rendered.lon,
                fromRemainingKm: rendered.remainingKm,
                fromStopId: rendered.fromStopId,
                toStopId: rendered.nextStopId,
                startMs: clock,
                durationMs: easeDurationMs(rendered, vehicle, polylines),
              })
            }
          }
          eases.clear()
          for (const [key, ease] of nextEases) eases.set(key, ease)
        }

        write(
          snapshot.map((vehicle) => {
            const committed = advanceHopPosition(vehicle, clock, polylines)
            const ease = easesRef.current.get(vehicleKey(vehicle))
            if (!ease) return committed
            const t = easeInOut(
              Math.min(1, Math.max(0, (clock - ease.startMs) / ease.durationMs))
            )
            if (t >= 1) {
              easesRef.current.delete(vehicleKey(vehicle))
              return committed
            }
            const hopChanged =
              ease.toStopId != null &&
              committed.nextStopId != null &&
              ease.toStopId !== committed.nextStopId
            if (
              hopChanged &&
              stillDwelling(
                committed.arrivedAtMs ?? ease.startMs,
                clock,
                DEFAULT_VEHICLE_VISCOSITY
              )
            ) {
              return {
                ...committed,
                lat: ease.fromLat,
                lon: ease.fromLon,
                remainingKm: 0,
              }
            }
            const sameHop =
              ease.fromRemainingKm != null &&
              committed.remainingKm != null &&
              !hopChanged &&
              (ease.fromStopId == null ||
                committed.fromStopId == null ||
                ease.fromStopId === committed.fromStopId)
            if (sameHop) {
              const remainingKm =
                ease.fromRemainingKm! +
                (committed.remainingKm! - ease.fromRemainingKm!) * t
              return placeAlongHop(committed, remainingKm, polylines)
            }
            return {
              ...committed,
              lat: ease.fromLat + (committed.lat - ease.fromLat) * t,
              lon: ease.fromLon + (committed.lon - ease.fromLon) * t,
            }
          })
        )
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
    // vehicles are read from vehiclesRef so the map is not remounted on polls.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapRef, coast, ready, write])

  return { flush }
}
