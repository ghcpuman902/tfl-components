"use client"

import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type MouseEvent,
  type RefObject,
} from "react"
import dynamic from "next/dynamic"
import { LocateFixed, Search } from "lucide-react"
import type { ExplorerTubeRailPoint } from "@/lib/tfl/explorer/common"
import type { ExplorerPoint } from "@/lib/tfl/explorer-point-normalise"
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
  stationPointOfRow,
  type PlaceHit,
} from "@/lib/tfl/homepage-live/search"
import {
  COLLAPSED_ITEMS,
  dayRoutes,
  groupSearchRows,
  type SearchCluster,
} from "@/lib/tfl/homepage-live/search-groups"
import {
  estimateKeyboardHeight,
  measureKeyboardHeight,
  readKeyboardHeight,
  writeKeyboardHeight,
} from "@/lib/tfl/homepage-live/keyboard-zone"
import { nearbyExplorerPoints } from "@/lib/tfl/explorer-point-search"
import { normaliseRailPoint } from "@/lib/tfl/explorer-point-normalise"
import {
  NEAREST_LIMIT,
  nearestBusRows,
  noMatchFor,
  rowsForMode,
  searchesBusStops,
  type SearchMode,
} from "@/lib/tfl/homepage-live/search-mode"
import { searchBoardCycleDocks } from "@/lib/tfl/board-place-search-action"
import { CycleHireDockMarker } from "@/components/tfl/cycle-hire/cycle-hire-dock-marker"
import {
  adoptServedStopIndex,
  loadStopSearch,
  type StopRow,
  type StopSearchKit,
} from "@/lib/tfl/stop-index"
import { StopLetterBadge } from "@/components/tfl/arrivals/stop-letter-badge"
import { BusNumberChip } from "@/components/tfl/arrivals/bus-number-chip"
import { cn } from "@/lib/utils"

/** Enough rows that a same-name cluster (Bank Station A–K) arrives whole. */
const INSTANT_LIMIT = 40

const SearchMap = dynamic(
  () =>
    import("@/components/explorer/explorer-point-map").then(
      (mod) => mod.ExplorerPointMap
    ),
  { ssr: false, loading: () => <div className="size-full bg-muted" aria-hidden /> }
)

type Replay = { fixture: string; round: number } | undefined

const MODE_LABELS: Readonly<Record<string, string>> = {
  tube: "Tube",
  "elizabeth-line": "Elizabeth line",
  dlr: "DLR",
  overground: "Overground",
  tram: "Tram",
  "national-rail": "National Rail",
}

/** Line colours as square marks; `data-line` supplies `--line-color`. */
const LineMarks = ({ lines }: { lines: readonly string[] }) => (
  <span className="flex flex-wrap items-center justify-end gap-1" aria-hidden>
    {lines.slice(0, 8).map((line) => (
      <span key={line} data-line={line} className="h-1.5 w-4 bg-(--line-color)" />
    ))}
  </span>
)

const RouteChips = ({ routes, max }: { routes: readonly string[]; max: number }) => (
  <span className="flex max-w-[45%] shrink-0 flex-wrap justify-end gap-1 sm:max-w-60">
    {routes.slice(0, max).map((route) => (
      <BusNumberChip key={route} label={route} />
    ))}
  </span>
)

const rowLabel = (row: StopRow) =>
  row.kind === "station"
    ? `${row.name}, station`
    : `${row.name}${row.letter ? `, stop ${row.letter}` : ""}${row.towards ? `, towards ${row.towards}` : ""}, bus stop`

const pointOfRow = (row: StopRow): ExplorerPoint => ({
  id: row.id,
  name: row.name,
  kind: "stopPoint",
  lat: row.lat,
  lon: row.lon,
  ...(row.kind === "bus"
    ? { modes: ["bus"], stopLetter: row.letter, towards: row.towards }
    : { modes: row.modes.filter((mode) => mode !== "bus"), lineIds: [...row.lines] }),
})

const MIN_FIT_PX = 18
const MIN_PLACEHOLDER_PX = 14
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
      const fitPx = room > 0 && width > room ? Math.floor((max * room) / width) : null
      el.style.fontSize = fitPx === null ? "" : `${Math.max(MIN_FIT_PX, fitPx)}px`
      // Typed text stays at 18 px or more (iOS zoom); only the placeholder may go smaller to fit.
      if (!text && fitPx !== null && fitPx < MIN_FIT_PX) {
        // Glyph widths don't scale linearly at small sizes, so step down until it measures in.
        let px = Math.max(MIN_PLACEHOLDER_PX, fitPx)
        const widthAt = (size: number) => {
          measureContext!.font = `${style.fontWeight} ${size}px ${style.fontFamily}`
          return measureContext!.measureText(el.placeholder).width
        }
        while (px > MIN_PLACEHOLDER_PX && widthAt(px) > room) px -= 1
        el.style.setProperty("--placeholder-size", `${px}px`)
      } else {
        el.style.removeProperty("--placeholder-size")
      }
    }
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(el)
    // The first fit can run on the fallback font; fit again once the web font is in.
    document.fonts?.addEventListener("loadingdone", fit)
    void document.fonts?.ready.then(fit)
    return () => {
      observer.disconnect()
      document.fonts?.removeEventListener("loadingdone", fit)
    }
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

const localStore = () => {
  try {
    return window.localStorage
  } catch {
    return undefined
  }
}

type Option = { id: string; label: string; expanded?: boolean }
type Entry = {
  option: Option
  row?: StopRow
  cluster?: SearchCluster
  dock?: ExplorerPoint
  nested?: boolean
}

const dockCounts = (dock: ExplorerPoint) =>
  `${Math.max(0, (dock.bikes ?? 0) - (dock.eBikes ?? 0))} bikes · ${dock.eBikes ?? 0} e-bikes · ${dock.spaces ?? 0} spaces`

const DockMarker = ({ dock }: { dock: ExplorerPoint }) => {
  const bikes = dock.bikes ?? 0
  const eBikes = dock.eBikes ?? 0
  const spaces = dock.spaces ?? 0
  return (
    <CycleHireDockMarker
      dock={{
        id: dock.id,
        name: dock.name,
        bikes,
        eBikes,
        spaces,
        docks: bikes + spaces,
        brokenDocks: 0,
        standardBikes: Math.max(0, bikes - eBikes),
        lat: dock.lat,
        lon: dock.lon,
      }}
      size={32}
      className="shrink-0 self-center"
    />
  )
}

const MODE_COPY: Record<SearchMode, { label: string; list: string; all: string }> = {
  rail: { label: "Search a station", list: "Matching stations", all: "stations" },
  bus: { label: "Search a bus stop", list: "Matching bus stops", all: "stops" },
  cycle: { label: "Search a dock", list: "Matching docks", all: "docks" },
}

/** Cycle mode: docks by name, or nearest the anchor while the field is empty. */
const useDockSearch = (
  on: boolean,
  query: string,
  near: { lat: number; lon: number } | undefined
) => {
  const [found, setFound] = useState<{ key: string; docks: ExplorerPoint[]; error?: string }>({
    key: "",
    docks: [],
  })
  const key = on ? `${query.trim()}|${near?.lat},${near?.lon}` : ""
  useEffect(() => {
    if (!key) return
    let live = true
    const timer = setTimeout(() => {
      void searchBoardCycleDocks(query, near).then((result) => {
        if (!live) return
        setFound(
          result.ok
            ? { key, docks: result.docks }
            : { key, docks: [], error: result.error }
        )
      })
    }, query.trim() ? 250 : 0)
    return () => {
      live = false
      clearTimeout(timer)
    }
    // `key` carries the query and the anchor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return { docks: found.docks, error: found.error, pending: Boolean(key) && found.key !== key }
}

export type PlaceSearchProps = {
  /** Resolves a chosen station to the StopPoints that carry its arrivals; also feeds "Near me". */
  stations: readonly ExplorerTubeRailPoint[]
  hubStationIds: Readonly<Record<string, string>>
  anchor?: { lat?: number; lon?: number }
  replay?: Replay
  /** Replay only: holds TfL's answer back so the index rows can be seen before the merge. */
  searchDelayMs?: number
  onSelect: (hit: PlaceHit) => void
  /**
   * A Board editor's search: one kind of place, and with an empty field the
   * nearest ones to `anchor`. Left out, the search is the homepage's.
   */
  mode?: SearchMode
  placeholder?: string
  /** Ids already on the board; their rows say so. */
  chosenIds?: readonly string[]
  /** Cycle mode: a dock was picked. */
  onSelectDock?: (dock: ExplorerPoint) => void
}

/**
 * At rest a quiet field above the Board. Focus turns the same field into the
 * top of a full-screen search view: map, the best match held in place, then a
 * keyboard-high zone holding the rest of the list, so nothing moves when the
 * keyboard opens or closes.
 */
export const PlaceSearch = ({
  stations,
  hubStationIds,
  anchor,
  replay,
  searchDelayMs,
  onSelect,
  mode,
  placeholder = "Station, stop or postcode",
  chosenIds,
  onSelectDock,
}: PlaceSearchProps) => {
  const [state, dispatch] = useReducer(combinedReducer, initialCombinedState)
  const [open, setOpen] = useState(false)
  const [keyboardPx, setKeyboardPx] = useState(0)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<{ query: string; clusters: string[]; all: boolean }>({
    query: "",
    clusters: [],
    all: false,
  })
  const [indexReady, setIndexReady] = useState(false)
  const [locateNote, setLocateNote] = useState<string | undefined>()
  const inputRef = useRef<HTMLInputElement>(null)
  const keyboardRef = useRef(0)
  const listId = useId()
  const optionId = (id: string) => `${listId}-${id}`

  const kitRef = useRef<StopSearchKit | null>(null)
  const searchRef = useRef<LiveSearch | null>(null)
  const latest = useRef({ anchor, replay, searchDelayMs, mode, stations })
  useEffect(() => {
    latest.current = { anchor, replay, searchDelayMs, mode, stations }
  })

  useEffect(() => {
    const nearestFor = (near: { lat: number; lon: number }): StopRow[] => {
      const { mode: kind, stations: all } = latest.current
      if (kind === "bus") {
        const kit = kitRef.current
        return kit ? nearestBusRows(kit.index, near) : []
      }
      if (kind !== "rail") return []
      return nearbyExplorerPoints(all.map(normaliseRailPoint), near, 2_000, NEAREST_LIMIT).flatMap(
        (point) => {
          const station = all.find((s) => s.id === point.id)
          return station
            ? [
                {
                  id: station.id,
                  name: station.displayName,
                  kind: "station" as const,
                  lat: station.lat,
                  lon: station.lon,
                  lines: station.lines,
                  modes: station.modes ?? [],
                },
              ]
            : []
        }
      )
    }
    const search = createLiveSearch({
      dispatch,
      instantFor: (query) => {
        const kit = kitRef.current
        const { anchor: near, mode: kind } = latest.current
        const at = near?.lat != null && near.lon != null ? { lat: near.lat, lon: near.lon } : undefined
        if (kind && !query.trim()) return at ? nearestFor(at) : []
        return kit && query.trim()
          ? rowsForMode(
              kit.searchStops(kit.index, query, { limit: INSTANT_LIMIT, near: at }),
              kind
            )
          : []
      },
      merge: () => {
        const merge = kitRef.current?.mergeLiveResults ?? appendLiveOnly
        const kind = latest.current.mode
        return kind ? (instant, live) => rowsForMode(merge(instant, live), kind) : merge
      },
      fetchLive: async (query, signal) => {
        if (!searchesBusStops(latest.current.mode)) return []
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

  useFitFontSize(inputRef, open ? state.query : "")

  // The page behind never scrolls, and K grows to the real keyboard the first time it is seen.
  useEffect(() => {
    if (!open) return
    const html = document.documentElement
    const previous = [html.style.overflow, document.body.style.overflow]
    html.style.overflow = "hidden"
    document.body.style.overflow = "hidden"
    const viewport = window.visualViewport
    const measure = () => {
      if (!viewport) return
      const measured = measureKeyboardHeight(window.innerHeight, viewport.height)
      if (measured == null || measured <= keyboardRef.current) return
      keyboardRef.current = measured
      setKeyboardPx(measured)
      writeKeyboardHeight(localStore(), measured)
    }
    const frame = requestAnimationFrame(measure)
    viewport?.addEventListener("resize", measure)
    return () => {
      cancelAnimationFrame(frame)
      viewport?.removeEventListener("resize", measure)
      html.style.overflow = previous[0] ?? ""
      document.body.style.overflow = previous[1] ?? ""
    }
  }, [open])

  const openView = () => {
    if (open) return
    const px = readKeyboardHeight(localStore()) ?? estimateKeyboardHeight(window.innerHeight)
    keyboardRef.current = px
    setKeyboardPx(px)
    setOpen(true)
    // An editor opens on the nearest places, before anything is typed.
    if (mode) searchRef.current?.type("")
  }

  const near = anchor?.lat != null && anchor.lon != null ? { lat: anchor.lat, lon: anchor.lon } : undefined
  const dockSearch = useDockSearch(open && mode === "cycle", state.query, near)
  const docks = dockSearch.docks
  const chosen = new Set(chosenIds ?? [])

  const rows = state.rows
  const groups = useMemo(() => groupSearchRows(rows), [rows])
  const best = mode === "cycle" ? undefined : groups.best
  const shown: { clusters: string[]; all: boolean } =
    expanded.query === state.query ? expanded : { clusters: [], all: false }
  const items = mode === "cycle" ? [] : shown.all ? groups.items : groups.items.slice(0, COLLAPSED_ITEMS)
  const hasMore = mode !== "cycle" && !shown.all && groups.items.length > COLLAPSED_ITEMS
  const points = useMemo(
    () =>
      mode === "cycle"
        ? docks.filter((dock) => dock.lat != null && dock.lon != null)
        : rows.filter((row) => row.lat != null && row.lon != null).map(pointOfRow),
    [docks, mode, rows]
  )

  const close = () => {
    setOpen(false)
    setActiveId(null)
    setExpanded({ query: "", clusters: [], all: false })
    searchRef.current?.type("")
    inputRef.current?.blur()
  }

  const choose = (row: StopRow) => {
    const hit = placeHitOfRow(row, stations, hubStationIds)
    close()
    onSelect(hit)
  }

  const toggleCluster = (cluster: SearchCluster) =>
    setExpanded({
      query: state.query,
      all: shown.all,
      clusters: shown.clusters.includes(cluster.id)
        ? shown.clusters.filter((id) => id !== cluster.id)
        : [...shown.clusters, cluster.id],
    })

  // Every pickable line in screen order: the sticky best match, then the zone's rows.
  const entries: Entry[] = []
  const pushRow = (row: StopRow, nested = false) =>
    entries.push({
      option: { id: nested ? `${row.id}:in-cluster` : row.id, label: rowLabel(row) },
      row,
      nested,
    })
  if (best) pushRow(best)
  for (const dock of mode === "cycle" ? docks : [])
    entries.push({ option: { id: dock.id, label: `${dock.name}, dock` }, dock })
  for (const item of items) {
    if (item.kind === "row") {
      pushRow(item.row)
      continue
    }
    const isOpen = shown.clusters.includes(item.id)
    entries.push({
      option: {
        id: item.id,
        label: `${item.name}, ${item.stops.length} bus stops`,
        expanded: isOpen,
      },
      cluster: item,
    })
    if (isOpen) for (const stop of item.stops) pushRow(stop, true)
  }
  const options = entries.map((entry) => entry.option)
  const active = activeId ? options.findIndex((option) => option.id === activeId) : -1
  const chooseDock = (dock: ExplorerPoint) => {
    close()
    onSelectDock?.(dock)
  }
  const activate = (entry: Entry | undefined) => {
    if (entry?.row) choose(entry.row)
    else if (entry?.dock) chooseDock(entry.dock)
    else if (entry?.cluster) toggleCluster(entry.cluster)
  }
  const rowById = new Map(rows.map((row) => [row.id, row]))
  const dockById = new Map(docks.map((dock) => [dock.id, dock]))
  // The sticky row holds the best match; in cycle mode, the first dock.
  const head = best ? entries[0] : mode === "cycle" ? entries[0] : undefined
  const mapSelectedId = entries[active]?.row?.id ?? entries[active]?.dock?.id ?? head?.row?.id ?? head?.dock?.id

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
        close()
        onSelect(stationHitOf(point))
      },
      () => setLocateNote("Location is off. Type a station instead."),
      { timeout: 8_000, maximumAge: 60_000 }
    )
  }

  const empty =
    mode === "cycle"
      ? !dockSearch.pending && !dockSearch.error && docks.length === 0 && Boolean(state.query.trim())
      : state.query.trim() && rows.length === 0 && indexReady && (state.status === "ok" || state.status === "idle")
  const nearestNote = mode && !state.query.trim() && entries.length > 0 ? "Nearest first." : null
  const footer =
    mode === "cycle"
      ? (dockSearch.error ?? (empty ? noMatchFor(mode) : nearestNote))
      : state.status === "slow"
        ? "Searching bus stops…"
        : state.status === "failed"
          ? state.message
          : empty
            ? mode
              ? noMatchFor(mode)
              : NO_PLACES
            : nearestNote

  const optionProps = (option: Option, index: number) => ({
    id: optionId(option.id),
    role: "option" as const,
    "aria-selected": index === active,
    "aria-label": option.label,
    "aria-expanded": option.expanded,
    onMouseDown: (event: MouseEvent) => event.preventDefault(),
    onMouseEnter: () => setActiveId(option.id),
  })

  const rowBody = (row: StopRow) => {
    const station = row.kind === "station" ? stationPointOfRow(row, stations, hubStationIds) : undefined
    const modes: readonly string[] = station?.modes ?? row.modes
    const detail = chosen.has(row.id)
      ? "On the board"
      : row.kind === "station"
        ? [
            ...modes.flatMap((mode) => (MODE_LABELS[mode] ? [MODE_LABELS[mode]] : [])),
            station?.zone ? `Zone ${station.zone}` : null,
          ]
            .filter(Boolean)
            .join(" · ")
        : row.towards
          ? `towards ${row.towards}`
          : ""
    return (
      <>
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center text-lg leading-snug">
            <span className="truncate">{row.name}</span>
            {row.kind === "bus" && row.letter ? (
              <StopLetterBadge letter={row.letter} size="sm" className="ml-2 -translate-y-px" />
            ) : null}
          </span>
          {detail ? (
            <span className="block truncate text-sm text-muted-foreground">{detail}</span>
          ) : null}
        </span>
        {row.kind === "station" ? (
          <span className="max-w-[45%] shrink-0 self-start pt-2">
            <LineMarks lines={station?.lines ?? row.lines} />
          </span>
        ) : (
          <RouteChips routes={dayRoutes(row.lines)} max={6} />
        )}
      </>
    )
  }

  const dockBody = (dock: ExplorerPoint) => (
    <>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-lg leading-snug">{dock.name}</span>
        <span className="block truncate text-sm text-muted-foreground">
          {chosen.has(dock.id) ? "On the board" : dockCounts(dock)}
        </span>
      </span>
      <DockMarker dock={dock} />
    </>
  )
  const entryBody = (entry: Entry) =>
    entry.row ? rowBody(entry.row) : entry.dock ? dockBody(entry.dock) : null

  const listRow = "flex min-h-14 cursor-pointer items-start gap-3 border-b border-border py-2.5"

  return (
    // At rest it stacks over the Board's z-10 layers and under the sticky site header (z-30); open, the view covers the header.
    <div className={open ? "relative z-50" : "relative z-20"}>
      <div className={open ? "fixed inset-x-0 top-0 h-dvh bg-background" : undefined}>
        <div className={cn("flex w-full flex-col", open && "mx-auto h-full max-w-3xl")}>
          <div className={cn(open && "shrink-0 px-4 pt-3 sm:px-8")}>
            <div className="flex h-[4.5rem] items-center gap-3 border-b border-foreground sm:h-[5.5rem]">
              <Search className="size-7 shrink-0" aria-hidden />
              <input
                ref={inputRef}
                type="text"
                role="combobox"
                aria-label={mode ? MODE_COPY[mode].label : "Search a station or bus stop"}
                aria-expanded={open && options.length > 0}
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={active >= 0 ? optionId(options[active]!.id) : undefined}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="go"
                placeholder={placeholder}
                value={open ? state.query : ""}
                onFocus={() => {
                  ensureIndex()
                  openView()
                }}
                onChange={(event) => {
                  setActiveId(null)
                  searchRef.current?.type(event.target.value)
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    close()
                    return
                  }
                  if (
                    event.key === "ArrowDown" ||
                    event.key === "ArrowUp" ||
                    event.key === "Home" ||
                    event.key === "End"
                  ) {
                    if (options.length === 0) return
                    event.preventDefault()
                    setActiveId(options[nextActiveIndex(active, event.key, options.length)]?.id ?? null)
                    return
                  }
                  if (event.key === "Enter") {
                    const entry = entries[active] ?? entries[0]
                    if (entry) {
                      event.preventDefault()
                      activate(entry)
                    }
                  }
                }}
                className="h-12 min-w-0 flex-1 bg-transparent text-3xl leading-none text-foreground outline-none placeholder:text-muted-foreground placeholder:[font-size:var(--placeholder-size,inherit)] sm:h-16 sm:text-5xl"
              />
              {/* "Near me" finds a station; bus stops and docks already open on the nearest. */}
              {mode === "bus" || mode === "cycle" ? null : (
                <button
                  type="button"
                  onClick={locate}
                  className="flex min-h-11 shrink-0 items-center border-0 bg-transparent px-1 text-muted-foreground hover:text-foreground"
                >
                  <LocateFixed className="size-5" aria-hidden />
                  <span className="sr-only">Near me</span>
                </button>
              )}
              {open ? (
                <button
                  type="button"
                  onClick={close}
                  className="min-h-11 shrink-0 border-0 bg-transparent px-1 text-base text-foreground"
                >
                  Cancel
                </button>
              ) : null}
            </div>
            {locateNote ? (
              <p role="status" className="pt-2 text-sm text-balance text-muted-foreground">
                {locateNote}
              </p>
            ) : null}
          </div>
          {open ? (
            <>
              <div className="relative min-h-0 flex-1">
                <SearchMap
                  points={points}
                  selectedId={mapSelectedId}
                  onSelect={(point) => {
                    const row = rowById.get(point.id)
                    const dock = dockById.get(point.id)
                    if (row) choose(row)
                    else if (dock) chooseDock(dock)
                  }}
                  cooperativeGestures={false}
                  busStopLabels={false}
                  className="min-h-0 rounded-none border-0"
                />
              </div>
              <div
                id={listId}
                role="listbox"
                aria-label={mode ? MODE_COPY[mode].list : "Matching stations and bus stops"}
                className="shrink-0"
              >
                <div
                  className={cn(
                    "flex h-16 items-center gap-3 overflow-hidden px-4 sm:px-8",
                    head && "cursor-pointer bg-muted"
                  )}
                  {...(head ? optionProps(head.option, 0) : { role: "presentation" })}
                  onClick={() => activate(head)}
                >
                  {head ? entryBody(head) : null}
                </div>
                <ul
                  role="group"
                  aria-label="More results"
                  className="overflow-y-auto overscroll-contain px-4 sm:px-8"
                  style={{ height: keyboardPx }}
                >
                  {entries.map((entry, at) =>
                    at === 0 && head ? null : (
                      <li
                        key={entry.option.id}
                        className={cn(
                          listRow,
                          entry.dock && "items-center",
                          entry.nested && "pl-4",
                          at === active && "bg-muted"
                        )}
                        {...optionProps(entry.option, at)}
                        onClick={() => activate(entry)}
                      >
                        {entry.row || entry.dock ? (
                          entryBody(entry)
                        ) : entry.cluster ? (
                          <>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-lg leading-snug">
                                {entry.cluster.name}
                                <span className="text-sm text-muted-foreground"> · bus</span>
                              </span>
                              <span className="block text-sm text-pretty text-muted-foreground">
                                {entry.cluster.stops.length} stops
                                {entry.cluster.letters ? ` · ${entry.cluster.letters}` : ""} ·{" "}
                                {entry.option.expanded ? "tap to close" : "tap to choose one"}
                              </span>
                            </span>
                            <RouteChips routes={entry.cluster.routes} max={9} />
                          </>
                        ) : null}
                      </li>
                    )
                  )}
                  {footer || hasMore ? (
                    <li role="presentation" className="flex min-h-11 items-center justify-between gap-3 py-2 text-sm text-muted-foreground">
                      <span className="text-balance" aria-live="polite">
                        {footer}
                      </span>
                      {hasMore ? (
                        <button
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => setExpanded({ query: state.query, clusters: shown.clusters, all: true })}
                          className="shrink-0 border-0 bg-transparent p-0 text-foreground underline underline-offset-4"
                        >
                          {mode === "rail"
                            ? `All ${groups.items.length + (best ? 1 : 0)} stations`
                            : `All ${groups.busCount} stops`}
                        </button>
                      ) : null}
                    </li>
                  ) : null}
                </ul>
              </div>
            </>
          ) : null}
        </div>
      </div>
      {/* Holds the field's place in the page while the field sits in the open view. */}
      {open ? <div aria-hidden className="h-[4.5rem] sm:h-[5.5rem]" /> : null}
    </div>
  )
}
