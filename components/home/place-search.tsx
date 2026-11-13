"use client"

import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type RefObject,
} from "react"
import { LocateFixed, Search } from "lucide-react"
import type { ExplorerTubeRailPoint } from "@/lib/tfl/explorer/common"
import {
  enrichBusStopsAction,
  searchBusStopsAction,
} from "@/lib/tfl/homepage-live/actions"
import {
  appendLiveOnly,
  combinedReducer,
  createLiveSearch,
  initialCombinedState,
  NO_PLACES,
  type LiveSearch,
} from "@/lib/tfl/homepage-live/combined-search"
import {
  liveHitOfBus,
  nextActiveIndex,
  placeHitOfRow,
  rankBusHits,
  stationHitOf,
  type PlaceHit,
} from "@/lib/tfl/homepage-live/search"
import { nearbyExplorerPoints } from "@/lib/tfl/explorer-point-search"
import { normaliseRailPoint } from "@/lib/tfl/explorer-point-normalise"
import {
  adoptServedStopIndex,
  loadStopSearch,
  type StopRow,
  type StopSearchKit,
} from "@/lib/tfl/stop-index"
import { cn } from "@/lib/utils"

const INSTANT_LIMIT = 14

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

const dayRoutes = (lines: readonly string[]) =>
  lines.filter((line) => !/^n\d/i.test(line))

const rowLabel = (row: StopRow) =>
  row.kind === "station"
    ? `${row.name}, station`
    : `${row.name}${row.letter ? `, stop ${row.letter}` : ""}${row.towards ? `, towards ${row.towards}` : ""}, bus stop`

const MIN_FIT_PX = 18
let measureContext: CanvasRenderingContext2D | null | undefined

/**
 * The big search text keeps its full name by shrinking to fit the box, never
 * below 18 px (16 px or more keeps iOS from zooming). The input has a fixed
 * height, so changing the size moves nothing.
 */
const useFitFontSize = (ref: RefObject<HTMLInputElement | null>, text: string) => {
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const fit = () => {
      measureContext ??= document.createElement("canvas").getContext("2d")
      if (!measureContext) return
      const max = matchMedia("(min-width: 640px)").matches ? 48 : 30
      const style = getComputedStyle(el)
      measureContext.font = `${style.fontWeight} ${max}px ${style.fontFamily}`
      const width = measureContext.measureText(text || el.placeholder).width
      const room = el.clientWidth
      el.style.fontSize =
        room > 0 && width > room
          ? `${Math.max(MIN_FIT_PX, Math.floor((max * room) / width))}px`
          : ""
    }
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref, text])
}

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms)
    signal.addEventListener("abort", () => {
      clearTimeout(timer)
      resolve()
    })
  })

export type PlaceSearchProps = {
  /** Resolves a chosen station to the StopPoints that carry its arrivals; also feeds "Near me". */
  stations: readonly ExplorerTubeRailPoint[]
  hubStationIds: Readonly<Record<string, string>>
  /** What the box shows when nothing is being typed. */
  valueLabel: string
  anchor?: { lat?: number; lon?: number }
  replay?: Replay
  /** Replay only: holds TfL's answer back so the index rows can be seen before the merge. */
  searchDelayMs?: number
  onSelect: (hit: PlaceHit) => void
  /** The highlighted result, so the map can preview it; null when nothing is highlighted. */
  onPreview: (hit: PlaceHit | null) => void
}

export const PlaceSearch = ({
  stations,
  hubStationIds,
  valueLabel,
  anchor,
  replay,
  searchDelayMs,
  onSelect,
  onPreview,
}: PlaceSearchProps) => {
  const [state, dispatch] = useReducer(combinedReducer, initialCombinedState)
  const [editing, setEditing] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [indexReady, setIndexReady] = useState(false)
  const [locateNote, setLocateNote] = useState<string | undefined>()
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = useId()
  const optionId = (id: string) => `${listId}-${id}`

  const kitRef = useRef<StopSearchKit | null>(null)
  const searchRef = useRef<LiveSearch | null>(null)
  const blurTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const latest = useRef({ anchor, replay, searchDelayMs })
  useEffect(() => {
    latest.current = { anchor, replay, searchDelayMs }
  })

  useEffect(() => {
    const search = createLiveSearch({
      dispatch,
      instantFor: (query) => {
        const kit = kitRef.current
        const near = latest.current.anchor
        return kit && query.trim()
          ? kit.searchStops(kit.index, query, {
              limit: INSTANT_LIMIT,
              near: near?.lat != null && near.lon != null ? { lat: near.lat, lon: near.lon } : undefined,
            })
          : []
      },
      merge: () => kitRef.current?.mergeLiveResults ?? appendLiveOnly,
      fetchLive: async (query, signal) => {
        const { replay: request, searchDelayMs: delay, anchor: near } = latest.current
        if (request && delay) await sleep(delay, signal)
        const result = await searchBusStopsAction(query, request)
        if (!result.ok) throw new Error(result.error)
        return rankBusHits(result.hits, query, near).map(liveHitOfBus)
      },
      enrich: async (ids) => {
        const result = await enrichBusStopsAction(ids, latest.current.replay)
        if (!result.ok) throw new Error(result.error)
        return Object.fromEntries(
          Object.entries(result.details).map(([id, d]) => [
            id,
            { letter: d.stopLetter, towards: d.towards, lines: d.routes },
          ])
        )
      },
    })
    searchRef.current = search
    return () => {
      search.dispose()
      searchRef.current = null
    }
  }, [])

  // The index is a big static chunk: fetched when the browser is idle or the box is focused.
  const ensureIndex = () => {
    if (kitRef.current) return
    loadStopSearch().then(
      (kit) => {
        kitRef.current = kit
        setIndexReady(true)
        searchRef.current?.indexReady()
        void adoptServedStopIndex(kit).then(
          (changed) => changed && searchRef.current?.indexReady()
        )
      },
      () => undefined
    )
  }
  useEffect(() => {
    const start = () => ensureIndex()
    if (typeof requestIdleCallback === "function") {
      const handle = requestIdleCallback(start)
      return () => cancelIdleCallback(handle)
    }
    const timer = setTimeout(start, 400)
    return () => clearTimeout(timer)
  }, [])
  useEffect(() => () => clearTimeout(blurTimer.current), [])

  useFitFontSize(inputRef, editing ? state.query : valueLabel)

  const rows = state.rows
  const open = editing && state.query.trim().length > 0
  const active = useMemo(
    () => (activeId ? rows.findIndex((row) => row.id === activeId) : -1),
    [rows, activeId]
  )

  const hitOf = (row: StopRow | undefined) =>
    row ? placeHitOfRow(row, stations, hubStationIds) : null

  const highlight = (index: number) => {
    const row = index >= 0 ? rows[index] : undefined
    setActiveId(row?.id ?? null)
    onPreview(hitOf(row))
  }

  const reset = () => {
    setEditing(false)
    setActiveId(null)
    searchRef.current?.type("")
    onPreview(null)
  }

  const choose = (row: StopRow) => {
    clearTimeout(blurTimer.current)
    const hit = hitOf(row)!
    reset()
    onSelect(hit)
    inputRef.current?.blur()
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
        clearTimeout(blurTimer.current)
        reset()
        onSelect(stationHitOf(point))
        inputRef.current?.blur()
      },
      () => setLocateNote("Location is off. Type a station instead."),
      { timeout: 8_000, maximumAge: 60_000 }
    )
  }

  const empty = open && rows.length === 0 && indexReady && (state.status === "ok" || state.status === "idle")
  const footer =
    state.status === "slow"
      ? "Searching bus stops…"
      : state.status === "failed"
        ? state.message
        : empty
          ? NO_PLACES
          : null

  return (
    // Its own stacking context above the map/Board grid that follows it in the DOM, so the open list paints over both.
    <div className="relative z-40">
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
          aria-activedescendant={active >= 0 ? optionId(rows[active]!.id) : undefined}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="go"
          placeholder="Station or bus stop"
          value={editing ? state.query : valueLabel}
          onFocus={(event) => {
            clearTimeout(blurTimer.current)
            ensureIndex()
            setEditing(true)
            event.currentTarget.select()
          }}
          onChange={(event) => {
            setActiveId(null)
            onPreview(null)
            searchRef.current?.type(event.target.value)
          }}
          onBlur={() => {
            // A tap on a row can blur first on touch browsers; give its click time to land.
            blurTimer.current = setTimeout(reset, 200)
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              reset()
              event.currentTarget.blur()
              return
            }
            if (
              event.key === "ArrowDown" ||
              event.key === "ArrowUp" ||
              event.key === "Home" ||
              event.key === "End"
            ) {
              if (!open || rows.length === 0) return
              event.preventDefault()
              highlight(nextActiveIndex(active, event.key, rows.length))
              return
            }
            if (event.key === "Enter") {
              const row = rows[active] ?? rows[0]
              if (row) {
                event.preventDefault()
                choose(row)
              }
            }
          }}
          className="h-12 min-w-0 flex-1 bg-transparent text-3xl leading-none text-foreground outline-none placeholder:text-muted-foreground sm:h-16 sm:text-5xl"
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
          className="absolute inset-x-0 top-full z-10 max-h-[60svh] overflow-y-auto overscroll-contain bg-background shadow-none"
        >
          {rows.map((row, index) => (
            <li
              key={row.id}
              id={optionId(row.id)}
              role="option"
              aria-selected={index === active}
              aria-label={rowLabel(row)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(row)}
              onMouseEnter={() => highlight(index)}
              className={cn(
                "flex min-h-14 cursor-pointer items-center gap-3 border-b border-border/60 px-1 py-2",
                index === active && "bg-muted"
              )}
            >
              {row.kind === "bus" ? <StopRoundel letter={row.letter} /> : null}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-lg">{row.name}</span>
                {row.kind === "bus" && row.towards ? (
                  <span className="block truncate text-sm text-muted-foreground">
                    towards {row.towards}
                  </span>
                ) : null}
              </span>
              <span className="flex min-h-6 w-[40%] max-w-60 shrink-0 flex-wrap items-center justify-end gap-x-2">
                {row.kind === "station" ? (
                  <LineDots lines={row.lines} />
                ) : (
                  dayRoutes(row.lines)
                    .slice(0, 6)
                    .map((route) => (
                      <span key={route} className="text-sm text-muted-foreground">
                        {route}
                      </span>
                    ))
                )}
              </span>
            </li>
          ))}
          <li
            className="min-h-11 px-1 py-2 text-sm text-balance text-muted-foreground"
            role="presentation"
            aria-live="polite"
          >
            {footer}
          </li>
        </ul>
      ) : null}
    </div>
  )
}
