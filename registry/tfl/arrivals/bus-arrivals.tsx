"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { RealtimePrediction } from "tfl-ts"
import { BusArrivalsBoard } from "@/components/tfl/arrivals/bus-arrivals-board"
import { BusNumberChip } from "@/components/tfl/arrivals/bus-number-chip"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  getBusArrivals,
  getNearbyBusStops,
  searchBusStops,
  type BusArrival,
  type GetBusArrivalsResult,
  type NearbyBusStop,
} from "@/lib/tfl/actions"
import { StopLetterBadge } from "@/components/tfl/arrivals/stop-letter-badge"
import {
  isValidLatLon,
  TRAFALGAR_SQUARE,
  truncateLatLon,
  type LatLonLabel,
} from "@/lib/tfl/geo"
import { Bus, Loader2, LocateFixed, MapPin, Search } from "lucide-react"
import { cn } from "@/lib/utils"

const LOCATION_CACHE_KEY = "tfl-bus-arrivals-location"

const readCachedLocation = (): LatLonLabel | null => {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(LOCATION_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<LatLonLabel>
    if (
      typeof parsed.lat !== "number" ||
      typeof parsed.lon !== "number" ||
      typeof parsed.label !== "string" ||
      !isValidLatLon(parsed.lat, parsed.lon) ||
      parsed.label.trim().length === 0
    ) {
      return null
    }
    const { lat, lon } = truncateLatLon(parsed.lat, parsed.lon)
    return { lat, lon, label: parsed.label.trim() }
  } catch {
    return null
  }
}

const writeCachedLocation = (location: LatLonLabel): void => {
  if (typeof window === "undefined") return
  try {
    const { lat, lon } = truncateLatLon(location.lat, location.lon)
    window.localStorage.setItem(
      LOCATION_CACHE_KEY,
      JSON.stringify({ lat, lon, label: location.label })
    )
  } catch {
    // Quota / private mode — continue without persistence.
  }
}

/** Skeleton for the bus arrivals board — use in `loading.tsx` or Suspense. */
export const BusArrivalsSkeleton = () => (
  <div className="w-full space-y-4" aria-busy aria-label="Loading bus arrivals">
    <div className="space-y-2">
      <Skeleton className="h-7 w-56 max-w-full" />
      <Skeleton className="h-4 w-full max-w-md" />
    </div>
    <div className="flex flex-col gap-2 sm:flex-row">
      <Skeleton className="h-9 w-full sm:w-44" />
      <Skeleton className="h-9 flex-1" />
      <Skeleton className="h-9 w-full sm:w-24" />
    </div>
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-20 w-full" />
      ))}
    </div>
    <div className="space-y-0 border-t border-border pt-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="my-2 h-10 w-full" />
      ))}
    </div>
  </div>
)

const formatDistance = (meters?: number): string => {
  if (meters === undefined) return ""
  if (meters < 1000) return `${Math.round(meters)}m`
  return `${(meters / 1000).toFixed(1)}km`
}

/** Shared line chip for the stop picker only. */
const LineBadge = ({ line }: { line: string }) => (
  <BusNumberChip label={line} className="text-[11px]" />
)

/** Map action rows into normalised predictions for {@link BusArrivalsBoard}. */
const toBoardData = (arrivals: readonly BusArrival[]): RealtimePrediction[] =>
  arrivals.map((arrival) => ({
    lineId: arrival.lineName,
    lineName: arrival.lineName,
    destinationName: arrival.destinationName,
    towards: arrival.towards,
    platformName: arrival.platformName,
    timeToStation: arrival.timeToStation,
    expectedArrival: arrival.expectedArrival,
    vehicleId: arrival.vehicleId,
    direction: arrival.direction,
  })) as RealtimePrediction[]

/** Numeric codes; avoid relying on the GeolocationPositionError global. */
const GEO_PERMISSION_DENIED = 1
const GEO_POSITION_UNAVAILABLE = 2
const GEO_TIMEOUT = 3

const geolocationErrorMessage = (code: number): string => {
  switch (code) {
    case GEO_PERMISSION_DENIED:
      return "Location is blocked for this site. Use the lock icon in the address bar → Site settings → Location → Allow, then try again."
    case GEO_POSITION_UNAVAILABLE:
      return "Location unavailable. Try again or search by stop name."
    case GEO_TIMEOUT:
      return "Location request timed out. Try again."
    default:
      return "Could not read your location."
  }
}

/**
 * Explorer / Block composition: geolocation or search → pick a stop →
 * {@link BusArrivalsBoard}. Prefer `BusArrivalsBoard` + your own fetch for the
 * installable Interface API.
 */
export const BusArrivals = () => {
  const [stops, setStops] = useState<NearbyBusStop[]>([])
  const [selectedStop, setSelectedStop] = useState<NearbyBusStop | null>(null)
  const [locationLabel, setLocationLabel] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [arrivalsResult, setArrivalsResult] =
    useState<GetBusArrivalsResult | null>(null)
  const [stopsError, setStopsError] = useState<string | null>(null)
  const [loadingLocation, setLoadingLocation] = useState(true)
  const [loadingSearch, setLoadingSearch] = useState(false)
  const [loadingArrivals, setLoadingArrivals] = useState(false)
  const hasBootstrapped = useRef(false)

  const loadArrivals = useCallback(async (stop: NearbyBusStop) => {
    setSelectedStop(stop)
    setLoadingArrivals(true)
    setArrivalsResult(null)
    try {
      const data = await getBusArrivals(stop.id, stop.name)
      setArrivalsResult(data)
    } catch {
      setArrivalsResult({
        ok: false,
        error: "Failed to load arrivals. Try another stop.",
      })
    } finally {
      setLoadingArrivals(false)
    }
  }, [])

  const handleNearbyFromCoords = useCallback(
    async (lat: number, lon: number, label: string) => {
      setStopsError(null)
      setStops([])
      setSelectedStop(null)
      setArrivalsResult(null)
      setLocationLabel(label)

      try {
        const data = await getNearbyBusStops(lat, lon)
        if (data.ok === false) {
          setStopsError(data.error)
          return
        }

        setStops(data.stops)
        await loadArrivals(data.stops[0]!)
      } catch {
        setStopsError("Failed to find nearby stops. Try searching by name.")
      }
    },
    [loadArrivals]
  )

  useEffect(() => {
    if (hasBootstrapped.current) return
    hasBootstrapped.current = true

    const cached = readCachedLocation()
    const location: LatLonLabel = cached ?? {
      lat: TRAFALGAR_SQUARE.lat,
      lon: TRAFALGAR_SQUARE.lon,
      label: TRAFALGAR_SQUARE.label,
    }
    if (!cached) {
      writeCachedLocation(location)
    }

    setLoadingLocation(true)
    void handleNearbyFromCoords(
      location.lat,
      location.lon,
      location.label
    ).finally(() => {
      setLoadingLocation(false)
    })
  }, [handleNearbyFromCoords])

  const handleUseLocation = async () => {
    if (loadingLocation || loadingSearch) return

    if (typeof window !== "undefined" && !window.isSecureContext) {
      setStopsError(
        "Location needs a secure origin. Open via http://localhost:3001 (not a LAN IP like 192.168.x.x)."
      )
      return
    }

    if (!navigator.geolocation) {
      setStopsError("Geolocation is not supported in this browser.")
      return
    }

    // If already blocked, Chrome will not show the permission prompt again.
    try {
      const permission = await navigator.permissions?.query({
        name: "geolocation",
      })
      if (permission?.state === "denied") {
        setStopsError(
          "Location is blocked for this site. Use the lock icon in the address bar → Site settings → Location → Allow, then try again."
        )
        return
      }
    } catch {
      // permissions.query is optional; continue to getCurrentPosition.
    }

    setLoadingLocation(true)
    setStopsError(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { lat, lon } = truncateLatLon(
          position.coords.latitude,
          position.coords.longitude
        )
        const label = `${lat.toFixed(3)}, ${lon.toFixed(3)}`
        writeCachedLocation({ lat, lon, label })
        void handleNearbyFromCoords(lat, lon, label).finally(() => {
          setLoadingLocation(false)
        })
      },
      (error) => {
        setLoadingLocation(false)
        setStopsError(geolocationErrorMessage(error.code))
      },
      {
        enableHighAccuracy: false,
        timeout: 12_000,
        maximumAge: 60_000,
      }
    )
  }

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loadingLocation || loadingSearch) return
    if (searchQuery.trim().length < 2) return

    setLoadingSearch(true)
    setStopsError(null)
    setStops([])
    setSelectedStop(null)
    setArrivalsResult(null)
    setLocationLabel(null)

    try {
      const data = await searchBusStops(searchQuery)
      if (data.ok === false) {
        setStopsError(data.error)
        return
      }

      setStops(data.stops)
      await loadArrivals(data.stops[0]!)
    } catch {
      setStopsError("Failed to search stops. Try again.")
    } finally {
      setLoadingSearch(false)
    }
  }

  const handleSearchQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  const handleStopSelect = (stop: NearbyBusStop) => {
    void loadArrivals(stop)
  }

  const handleStopKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    stop: NearbyBusStop
  ) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      handleStopSelect(stop)
    }
  }

  const findingStops = loadingLocation || loadingSearch

  return (
    <div>
      <h2 className="mb-1 flex items-center gap-2 text-xl font-semibold">
        <Bus className="size-5" aria-hidden />
        Bus arrivals near you
      </h2>
      <p className="mb-4 text-sm text-pretty text-muted-foreground">
        Defaults to Trafalgar Square (cached in this browser). Use my location
        to overwrite, or search by stop name. Powered by{" "}
        <code className="bg-background/60 px-1 py-0.5 text-xs">
          stopPoint.getByGeoPoint
        </code>
        ,{" "}
        <code className="bg-background/60 px-1 py-0.5 text-xs">
          stopPoint.search
        </code>
        , and{" "}
        <code className="bg-background/60 px-1 py-0.5 text-xs">
          stopPoint.getArrivals
        </code>
        .
      </p>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          onClick={handleUseLocation}
          disabled={findingStops}
          className="sm:w-auto"
          aria-busy={loadingLocation}
        >
          {loadingLocation ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Finding nearby stops…
            </>
          ) : (
            <>
              <LocateFixed className="size-4" aria-hidden />
              Use my location
            </>
          )}
        </Button>

        <form onSubmit={handleSearchSubmit} className="flex flex-1 gap-2">
          <div className="flex-1">
            <Label htmlFor="tfl-bus-search" className="sr-only">
              Search bus stops
            </Label>
            <Input
              id="tfl-bus-search"
              type="search"
              value={searchQuery}
              onChange={handleSearchQueryChange}
              placeholder="Or search by street or stop name"
              className="w-full bg-background"
              aria-label="Search bus stops"
              disabled={findingStops}
            />
          </div>
          <Button
            type="submit"
            variant="outline"
            disabled={findingStops || searchQuery.trim().length < 2}
            aria-busy={loadingSearch}
          >
            {loadingSearch ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                <span className="sr-only sm:not-sr-only">Searching…</span>
              </>
            ) : (
              <>
                <Search className="size-4 sm:mr-0" aria-hidden />
                <span className="sr-only sm:not-sr-only">Search</span>
              </>
            )}
          </Button>
        </form>
      </div>

      {stopsError && (
        <p className="mb-4 text-sm text-destructive" role="alert">
          {stopsError}
        </p>
      )}

      {locationLabel && stops.length > 0 && (
        <p className="mb-3 flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          Stops within 400m of {locationLabel} (GPS rounded to ~100m to avoid
          constant refreshes)
        </p>
      )}

      {stops.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-sm font-medium">Select a stop</p>
          <ul
            className="grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2"
            role="list"
          >
            {stops.map((stop) => {
              const isSelected = selectedStop?.id === stop.id
              const meta = [
                stop.towards ? `towards ${stop.towards}` : null,
                stop.distance !== undefined
                  ? `${formatDistance(stop.distance)} away`
                  : null,
              ].filter(Boolean)

              return (
                <li key={stop.id}>
                  <button
                    type="button"
                    onClick={() => handleStopSelect(stop)}
                    onKeyDown={(e) => handleStopKeyDown(e, stop)}
                    aria-pressed={isSelected}
                    aria-label={`Show arrivals for ${stop.name}${stop.stopLetter ? ` stop ${stop.stopLetter}` : ""}${stop.towards ? `, towards ${stop.towards}` : ""}`}
                    disabled={loadingArrivals}
                    className={cn(
                      "w-full border border-border p-3 text-left transition-colors",
                      "bg-background/60 hover:bg-background/80 dark:bg-background/20",
                      isSelected && "border-primary ring-1 ring-primary"
                    )}
                  >
                    <span className="flex items-center gap-1.5 text-sm font-medium">
                      <span className="truncate">{stop.name}</span>
                      {stop.stopLetter ? (
                        <StopLetterBadge letter={stop.stopLetter} size="sm" />
                      ) : null}
                    </span>
                    {meta.length > 0 && (
                      <span className="mt-1 block text-xs text-pretty text-muted-foreground">
                        {meta.join(" · ")}
                      </span>
                    )}
                    {stop.lines && stop.lines.length > 0 && (
                      <span className="mt-1.5 flex flex-wrap gap-1">
                        {stop.lines.slice(0, 6).map((line) => (
                          <LineBadge key={line} line={line} />
                        ))}
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {(loadingArrivals || arrivalsResult !== null) && selectedStop && (
        <div className="border-t border-border pt-4">
          {selectedStop.towards ? (
            <p className="mb-3 text-xs text-muted-foreground">
              towards {selectedStop.towards}
            </p>
          ) : null}
          <BusArrivalsBoard
            data={
              arrivalsResult?.ok === true
                ? toBoardData(arrivalsResult.arrivals)
                : undefined
            }
            stopName={selectedStop.name}
            stopLetter={selectedStop.stopLetter}
            headingLevel={2}
            loading={loadingArrivals}
            error={
              arrivalsResult?.ok === false ? "Couldn't load arrivals." : null
            }
            emptyMessage="No buses due at this stop right now."
            maxRows={12}
          />
        </div>
      )}
    </div>
  )
}
