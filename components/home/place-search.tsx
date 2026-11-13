"use client"

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react"
import { LocateFixed, Search } from "lucide-react"
import type { ExplorerTubeRailPoint } from "@/lib/tfl/explorer/common"
import {
  enrichBusStopsAction,
  searchBusStopsAction,
} from "@/lib/tfl/homepage-live/actions"
import {
  initialSearchState,
  mergePlaces,
  nextActiveIndex,
  NO_PLACES,
  placeKey,
  rankBusHits,
  searchReducer,
  searchStations,
  type BusHit,
  type PlaceHit,
  type StationHit,
} from "@/lib/tfl/homepage-live/search"
import { nearbyExplorerPoints } from "@/lib/tfl/explorer-point-search"
import { normaliseRailPoint } from "@/lib/tfl/explorer-point-normalise"
import { cn } from "@/lib/utils"

const DEBOUNCE_MS = 180
const SLOW_MS = 120
const WATCHDOG_MS = 8_000

type Replay = { fixture: string; round: number } | undefined

/** Line colours as dots; `data-line` supplies `--line-color`. */
const LineDots = ({ lines }: { lines: readonly string[] }) => (
  <span className="flex flex-wrap items-center gap-1" aria-hidden>
    {lines.slice(0, 8).map((line) => (
      <span
        key={line}
        data-line={line}
        className="h-1.5 w-4 rounded-full bg-(--line-color)"
      />
    ))}
  </span>
)

const StopRoundel = ({ letter }: { letter?: string }) => (
  <span
    className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#dc241f] text-sm leading-none text-white"
    aria-hidden
  >
    {letter ?? "•"}
  </span>
)

const rowLabel = (hit: PlaceHit) =>
  hit.kind === "station"
    ? `${hit.name}, station`
    : `${hit.name}${hit.stopLetter ? `, stop ${hit.stopLetter}` : ""}${hit.towards ? `, towards ${hit.towards}` : ""}, bus stop`

export type PlaceSearchProps = {
  stations: readonly ExplorerTubeRailPoint[]
  /** What the box shows when nothing is being typed. */
  valueLabel: string
  anchor?: { lat?: number; lon?: number }
  replay?: Replay
  onSelect: (hit: PlaceHit) => void
  /** The highlighted result, so the map can preview it; null when nothing is highlighted. */
  onPreview: (hit: PlaceHit | null) => void
}

export const PlaceSearch = ({
  stations,
  valueLabel,
  anchor,
  replay,
  onSelect,
  onPreview,
}: PlaceSearchProps) => {
  const [state, dispatch] = useReducer(searchReducer, initialSearchState)
  const [editing, setEditing] = useState(false)
  const [active, setActive] = useState(-1)
  const [locateNote, setLocateNote] = useState<string | undefined>()
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = useId()
  const optionId = (index: number) => `${listId}-${index}`

  const stationHits = useMemo(
    () => (editing ? searchStations(stations, state.query) : []),
    [editing, stations, state.query]
  )
  const places = useMemo(
    () =>
      mergePlaces(
        stationHits,
        editing ? rankBusHits(state.hits, state.query, anchor) : []
      ),
    [stationHits, editing, state.hits, state.query, anchor]
  )
  const open = editing && state.query.trim().length > 0
  const latest = useRef({ query: state.query, replay })
  const blurTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => {
    latest.current = { query: state.query, replay }
  })
  useEffect(() => () => clearTimeout(blurTimer.current), [])

  // One bus-stop search per keystroke attempt; anything older is abandoned.
  useEffect(() => {
    if (state.status !== "pending") return
    const attempt = state.attempt
    let live = true
    const timers: ReturnType<typeof setTimeout>[] = []
    timers.push(
      setTimeout(async () => {
        const { query, replay: replayRequest } = latest.current
        timers.push(setTimeout(() => live && dispatch({ type: "slow", attempt }), SLOW_MS))
        timers.push(setTimeout(() => live && dispatch({ type: "timeout", attempt }), WATCHDOG_MS))
        try {
          const result = await searchBusStopsAction(query, replayRequest)
          if (!live) return
          if (!result.ok) {
            dispatch({ type: "failed", attempt })
            return
          }
          dispatch({ type: "result", attempt, hits: result.hits })
          const ids = result.hits.slice(0, 8).map((hit) => hit.id)
          if (ids.length === 0) return
          const enriched = await enrichBusStopsAction(ids, replayRequest)
          if (live && enriched.ok)
            dispatch({ type: "enriched", attempt, details: enriched.details as Record<string, Partial<BusHit>> })
        } catch {
          if (live) dispatch({ type: "failed", attempt })
        }
      }, DEBOUNCE_MS)
    )
    return () => {
      live = false
      timers.forEach(clearTimeout)
    }
    // Keyed on the attempt: status changes within an attempt must not restart it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.attempt])

  const highlight = useCallback(
    (index: number) => {
      setActive(index)
      onPreview(index >= 0 ? (places[index] ?? null) : null)
    },
    [onPreview, places]
  )

  const choose = (hit: PlaceHit) => {
    clearTimeout(blurTimer.current)
    setEditing(false)
    setActive(-1)
    dispatch({ type: "typed", query: "" })
    onPreview(null)
    onSelect(hit)
    inputRef.current?.blur()
  }

  const close = () => {
    setEditing(false)
    setActive(-1)
    dispatch({ type: "typed", query: "" })
    onPreview(null)
  }

  const locate = () => {
    if (!("geolocation" in navigator)) {
      setLocateNote("This browser cannot share your location.")
      return
    }
    setLocateNote(undefined)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const [nearest] = nearbyExplorerPoints(
          stations.map(normaliseRailPoint),
          { lat: coords.latitude, lon: coords.longitude },
          2_000,
          1
        )
        const point = stations.find((s) => s.id === nearest?.id)
        if (!point) {
          setLocateNote("No station within 2 km of you.")
          return
        }
        choose(searchStations(stations, point.displayName, 1)[0] ?? stationOf(point))
      },
      () => setLocateNote("Location is off. Type a station instead."),
      { timeout: 8_000, maximumAge: 60_000 }
    )
  }

  const empty =
    open &&
    places.length === 0 &&
    state.status !== "pending" &&
    state.status !== "slow" &&
    state.status !== "failed"

  return (
    <div className="relative">
      <div className="flex items-center gap-3 border-b-2 border-foreground pb-3">
        <Search className="size-7 shrink-0" aria-hidden />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-label="Search a station or bus stop"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? optionId(active) : undefined}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="go"
          placeholder="Station or bus stop"
          value={editing ? state.query : valueLabel}
          onFocus={(event) => {
            clearTimeout(blurTimer.current)
            setEditing(true)
            event.currentTarget.select()
          }}
          onChange={(event) => {
            setActive(-1)
            onPreview(null)
            dispatch({ type: "typed", query: event.target.value })
          }}
          onBlur={() => {
            // A tap on a row can blur first on touch browsers; give its click time to land.
            blurTimer.current = setTimeout(close, 200)
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              close()
              event.currentTarget.blur()
              return
            }
            if (
              event.key === "ArrowDown" ||
              event.key === "ArrowUp" ||
              event.key === "Home" ||
              event.key === "End"
            ) {
              if (!open || places.length === 0) return
              event.preventDefault()
              highlight(nextActiveIndex(active, event.key, places.length))
              return
            }
            if (event.key === "Enter") {
              const hit = places[active] ?? places[0]
              if (hit) {
                event.preventDefault()
                choose(hit)
              }
            }
          }}
          className="min-w-0 flex-1 bg-transparent text-3xl leading-tight text-foreground outline-none placeholder:text-muted-foreground sm:text-5xl"
        />
        <button
          type="button"
          onClick={locate}
          className="flex min-h-11 shrink-0 items-center gap-2 px-1 text-base text-muted-foreground hover:text-foreground"
        >
          <LocateFixed className="size-5" aria-hidden />
          <span className="hidden sm:inline">Near me</span>
          <span className="sr-only sm:hidden">Near me</span>
        </button>
      </div>
      {locateNote ? (
        <p role="status" className="pt-2 text-sm text-balance text-muted-foreground">
          {locateNote}
        </p>
      ) : null}
      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-label="Matching stations and bus stops"
          className="absolute inset-x-0 top-full z-30 max-h-[60svh] overflow-y-auto bg-background"
        >
          {places.map((hit, index) => (
            <li
              key={placeKey(hit)}
              id={optionId(index)}
              role="option"
              aria-selected={index === active}
              aria-label={rowLabel(hit)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(hit)}
              onMouseEnter={() => highlight(index)}
              className={cn(
                "flex min-h-14 cursor-pointer items-center gap-3 border-b border-border/60 px-1 py-2",
                index === active && "bg-muted"
              )}
            >
              {hit.kind === "bus" ? <StopRoundel letter={hit.stopLetter} /> : null}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-lg">{hit.name}</span>
                {hit.kind === "bus" && hit.towards ? (
                  <span className="block truncate text-sm text-muted-foreground">
                    towards {hit.towards}
                  </span>
                ) : null}
              </span>
              {hit.kind === "station" ? (
                <LineDots lines={(hit as StationHit).lines} />
              ) : (
                <span className="flex max-w-[40%] flex-wrap justify-end gap-x-2 text-sm text-muted-foreground">
                  {hit.routes.slice(0, 6).map((route) => (
                    <span key={route}>{route}</span>
                  ))}
                </span>
              )}
            </li>
          ))}
          <li className="min-h-11 px-1 py-2 text-sm text-balance text-muted-foreground" role="presentation" aria-live="polite">
            {state.status === "slow"
              ? "Searching bus stops…"
              : state.status === "failed"
                ? state.message
                : empty
                  ? NO_PLACES
                  : null}
          </li>
        </ul>
      ) : null}
    </div>
  )
}

const stationOf = (point: ExplorerTubeRailPoint): StationHit => ({
  kind: "station",
  id: point.id,
  name: point.displayName,
  lines: point.lines,
  lat: point.lat,
  lon: point.lon,
  stopIds: point.arrivalsStopIds?.length ? point.arrivalsStopIds : [point.id],
})
