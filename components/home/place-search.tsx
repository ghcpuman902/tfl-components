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
  type ReactNode,
  type RefObject,
} from "react"
import dynamic from "next/dynamic"
import { ArrowLeft, LocateFixed, Search } from "lucide-react"
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
import {
  browseRows,
  busStopDots,
  dotKey,
  PIN_MIN_ZOOM,
  fitFor,
  frameMatches,
  frameWins,
  inFrame,
  leadWith,
  provisionalFrame,
  searchInFrame,
  strongestRows,
  type Frame,
} from "@/lib/tfl/homepage-live/search-frame"
import {
  MAP_SEARCH_RADIUS_METERS,
  MAP_SELECTED_ZOOM,
  distanceMeters,
} from "@/lib/tfl/geo"
import { nearbyExplorerPoints } from "@/lib/tfl/explorer-point-search"
import { normaliseRailPoint } from "@/lib/tfl/explorer-point-normalise"
import {
  NEAREST_LIMIT,
  nearestBusRows,
  noMatchFor,
  rowsForMode,
  searchesBusStops,
  servedRows,
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
import { StationName } from "@/components/tfl/station-name"
import { LineColorBar } from "@/components/tfl/brand/line-badge"
import { BusNumberChip } from "@/components/tfl/arrivals/bus-number-chip"
import { cn } from "@/lib/utils"

/** Enough rows that a same-name cluster (Bank Station A–K) arrives whole. */
const INSTANT_LIMIT = 40
/** The most of the screen the open view will leave above the field to keep it in place. */
const MAX_OPEN_TOP_SHARE = 0.25

/**
 * The gap the open view puts above the field so the field stays exactly where it was
 * tapped: its distance from the top of the open view, which starts at the site header's
 * height (not its painted bottom, a border lower). Unrounded, so it lands to the pixel.
 */
const openViewInset = (field: HTMLElement | null) => {
  if (!field) return 0
  const probe = document.createElement("div")
  probe.style.cssText = "position:fixed;visibility:hidden;top:var(--site-header-height)"
  document.body.appendChild(probe)
  const viewTop = probe.getBoundingClientRect().top
  probe.remove()
  const gap = field.getBoundingClientRect().top - viewTop
  return Math.min(window.innerHeight * MAX_OPEN_TOP_SHARE, Math.max(0, gap))
}

const SearchMap = dynamic(
  () =>
    import("@/components/explorer/explorer-point-map").then(
      (mod) => mod.ExplorerPointMap
    ),
  {
    ssr: false,
    loading: () => <div className="size-full bg-muted" aria-hidden />,
  }
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

/** The station's lines as the registry's square-ended LineColorBar dashes, never rounded pills. */
const LineMarks = ({ lines }: { lines: readonly string[] }) => (
  <span className="flex flex-wrap items-center justify-end gap-1" aria-hidden>
    {lines.slice(0, 8).map((line) => (
      <span key={line} className="w-4">
        <LineColorBar lineId={line} heightClass="h-1.5" />
      </span>
    ))}
  </span>
)

const RouteChips = ({
  routes,
  max,
}: {
  routes: readonly string[]
  max: number
}) => (
  <span className="flex max-w-[45%] shrink-0 flex-wrap justify-end gap-1 sm:max-w-60">
    {routes.slice(0, max).map((route) => (
      <BusNumberChip key={route} label={route} />
    ))}
  </span>
)

/**
 * The room a name has in its row: the row's width less its siblings (a stop
 * letter) and the gaps. The name fits against this, not its own box, so its slot
 * can be as wide as the name and the letter sits right after it (A5).
 */
const useNameRoom = () => {
  const ref = useRef<HTMLSpanElement>(null)
  const [room, setRoom] = useState<number>()
  useLayoutEffect(() => {
    const row = ref.current?.parentElement
    if (!row) return
    const measure = () => {
      const gap = parseFloat(getComputedStyle(row).columnGap) || 0
      const siblings = [...row.children].filter((child) => child !== ref.current)
      const taken = siblings.reduce(
        (sum, child) => sum + child.getBoundingClientRect().width + gap,
        0
      )
      setRoom(Math.max(0, Math.floor(row.clientWidth - taken)))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(row)
    return () => observer.disconnect()
  }, [])
  return { ref, room }
}

/** Painted text only: skips the zero-size and absolutely placed find helpers. */
const paintsText = (el: HTMLElement | null, root: HTMLElement) => {
  for (let node = el; node && node !== root; node = node.parentElement) {
    const style = getComputedStyle(node)
    if (style.position === "absolute" || parseFloat(style.fontSize) < 2) return false
  }
  return true
}

/** Widest painted line of the text inside `el`, px (a wrapped box is wider than its lines). */
const widestLine = (el: HTMLElement) => {
  const left = el.getBoundingClientRect().left
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  let widest = 0
  for (let text = walker.nextNode(); text; text = walker.nextNode()) {
    if (!text.textContent?.trim() || !paintsText(text.parentElement, el)) continue
    const range = document.createRange()
    range.selectNodeContents(text)
    for (const rect of range.getClientRects())
      if (rect.width > 0.5) widest = Math.max(widest, rect.right - left)
  }
  return widest
}

/**
 * A stop or station name that is never clipped, fitted the way the Board's
 * stop title is (StationNameTitle): abbreviate first on one line, and only when
 * no abbreviation fits let it wrap (`nowrap={false}`). No scale-down, so every
 * row keeps one text size. It fits against the room beside the stop letter
 * (useNameRoom), and its slot is only as wide as the name's widest line, so the
 * letter follows the name even when it wraps. Visual only; the option's
 * aria-label has the full name.
 */
const ListName = ({ name }: { name: string }) => {
  const { ref, room } = useNameRoom()
  // Width set on the DOM node, not in state: cleared, then the painted lines measured.
  useLayoutEffect(() => {
    const slot = ref.current
    if (!slot) return
    slot.style.width = ""
    const frame = requestAnimationFrame(() => {
      if (room === undefined) return
      const widest = Math.ceil(widestLine(slot))
      if (widest > 0 && widest < room) slot.style.width = `${widest + 1}px`
    })
    return () => cancelAnimationFrame(frame)
  }, [name, room, ref])
  return (
    <span ref={ref} className="min-w-0 flex-initial" aria-hidden>
      <StationName
        name={name.replace(/\s+/g, " ")}
        layout="auto"
        maxWidth={room}
        maxLines={1}
        allowAbbreviation
        nowrap={false}
      />
    </span>
  )
}

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
    : {
        modes: row.modes.filter((mode) => mode !== "bus"),
        lineIds: [...row.lines],
      }),
})

const MIN_FIT_PX = 18
const MIN_PLACEHOLDER_PX = 14
let measureContext: CanvasRenderingContext2D | null | undefined

/**
 * The big search text keeps its full name by shrinking to fit the box, never
 * below 18 px (16 px or more keeps iOS from zooming). The input has a fixed
 * height, so changing the size moves nothing.
 */
const useFitFontSize = (
  ref: RefObject<HTMLInputElement | null>,
  text: string
) => {
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
      const fitPx =
        room > 0 && width > room ? Math.floor((max * room) / width) : null
      el.style.fontSize =
        fitPx === null ? "" : `${Math.max(MIN_FIT_PX, fitPx)}px`
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

type MapFit = {
  attempt: number
  origin: { lat: number; lon: number } | null
  radiusMeters: number
  key: number
}
const NO_FIT: MapFit = {
  attempt: -1,
  origin: null,
  radiusMeters: MAP_SEARCH_RADIUS_METERS,
  key: 0,
}

type Option = { id: string; label: string; expanded?: boolean }
type Entry = {
  option: Option
  row?: StopRow
  cluster?: SearchCluster
  dock?: ExplorerPoint
  nested?: boolean
}

export const dockCounts = (dock: ExplorerPoint) =>
  `${Math.max(0, (dock.bikes ?? 0) - (dock.eBikes ?? 0))} bikes · ${dock.eBikes ?? 0} e-bikes · ${dock.spaces ?? 0} spaces`

export const DockMarker = ({ dock }: { dock: ExplorerPoint }) => {
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

const MODE_COPY: Record<SearchMode, { label: string; list: string; all: string; field: string }> = {
  rail: { label: "Search a station", list: "Matching stations", all: "stations", field: "Station" },
  bus: { label: "Search a bus stop", list: "Matching bus stops", all: "stops", field: "Bus stop" },
  cycle: { label: "Search a dock", list: "Matching docks", all: "docks", field: "Dock" },
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
  /** The Board's place (station point id or bus stop id), held as the best row while it is in the map frame. */
  currentId?: string
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
  /** Shown in the field at rest, e.g. the station already chosen. */
  restingValue?: string
  /** Desktop (lg+) only, while open: docked on the right, pushing the search column left. */
  aside?: ReactNode
  onOpenChange?: (open: boolean) => void
}

/**
 * At rest a quiet field above the Board. Focus opens the search in place under
 * the sticky site header: the field stays where it is, and the map, the best
 * match held in place, then a keyboard-high zone holding the rest of the list
 * cover the main area below it (never the nav), so nothing moves when the
 * keyboard opens or closes.
 */
export const PlaceSearch = ({
  stations,
  hubStationIds,
  anchor,
  currentId,
  replay,
  searchDelayMs,
  onSelect,
  mode,
  placeholder = "Station, stop or postcode",
  chosenIds,
  onSelectDock,
  restingValue,
  aside,
  onOpenChange,
}: PlaceSearchProps) => {
  const [state, dispatch] = useReducer(combinedReducer, initialCombinedState)
  const [open, setOpen] = useState(false)
  // Open, the field keeps its place: its gap under the site header, measured on focus.
  const [openTop, setOpenTop] = useState(0)
  const fieldRef = useRef<HTMLDivElement>(null)
  const [keyboardPx, setKeyboardPx] = useState(0)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<{
    query: string
    clusters: string[]
    all: boolean
  }>({
    query: "",
    clusters: [],
    all: false,
  })
  // A new object when the index loads and when a fresher served copy replaces it in place.
  const [index, setIndex] = useState<{ kit: StopSearchKit } | null>(null)
  const indexReady = index !== null
  // The map's view is the search range; until the map reports it, the box around the Board place.
  const [frame, setFrame] = useState<Frame>(() => provisionalFrame(anchor))
  const [zoom, setZoom] = useState(MAP_SELECTED_ZOOM)
  // The fit to a typed search's results when none is in the frame, once per search (attempt).
  const [fit, setFit] = useState<MapFit>(NO_FIT)
  // While a query is typed, the range it searches: our own fit moves the map but not the range; the user's moves do.
  const [pinnedRange, setPinnedRange] = useState<Frame | null>(null)
  const [locateNote, setLocateNote] = useState<string | undefined>()
  // "Near me" in a bus or dock editor: the places nearest you, not the Board's anchor.
  const [located, setLocated] = useState<{ lat: number; lon: number } | undefined>()
  const inputRef = useRef<HTMLInputElement>(null)
  const keyboardRef = useRef(0)
  const listId = useId()
  const optionId = (id: string) => `${listId}-${id}`

  const kitRef = useRef<StopSearchKit | null>(null)
  const searchRef = useRef<LiveSearch | null>(null)
  const typed = state.query.trim() !== ""
  const range = typed ? (pinnedRange ?? frame) : frame
  const latest = useRef({ range, anchor, replay, searchDelayMs, mode, stations })
  useEffect(() => {
    latest.current = { range, anchor: located ?? anchor, replay, searchDelayMs, mode, stations }
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
        const { range, anchor: near, mode: kind } = latest.current
        const at = near?.lat != null && near.lon != null ? { lat: near.lat, lon: near.lon } : undefined
        if (kind && !query.trim()) return at ? nearestFor(at) : []
        return kit && query.trim()
          ? rowsForMode(
              kit.searchStops(kit.index, query, {
                limit: INSTANT_LIMIT,
                near: kind ? at : range.center,
              }),
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
        const {
          replay: request,
          searchDelayMs: delay,
          range,
          anchor,
          mode: kind,
        } = latest.current
        const near = kind ? anchor : range.center
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

  // After "Near me" in a bus or dock editor, open the list on what is nearest to you.
  useEffect(() => {
    if (!located) return
    if (open) searchRef.current?.type("")
    else inputRef.current?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [located])

  // The index is a big static chunk: fetched when the browser is idle or the box is focused.
  const ensureIndex = () => {
    if (kitRef.current) return
    loadStopSearch().then(
      (kit) => {
        kitRef.current = kit
        setIndex({ kit })
        searchRef.current?.indexReady()
        void adoptServedStopIndex(kit).then((changed) => {
          if (!changed) return
          setIndex({ kit })
          searchRef.current?.indexReady()
        })
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
      const measured = measureKeyboardHeight(
        window.innerHeight,
        viewport.height
      )
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
    const px =
      readKeyboardHeight(localStore()) ??
      estimateKeyboardHeight(window.innerHeight)
    keyboardRef.current = px
    setKeyboardPx(px)
    setOpenTop(openViewInset(fieldRef.current))
    setFrame(provisionalFrame(anchor))
    setZoom(MAP_SELECTED_ZOOM)
    setOpen(true)
    onOpenChange?.(true)
    // An editor opens on the nearest places, before anything is typed.
    if (mode) searchRef.current?.type("")
  }

  const near =
    located ?? (anchor?.lat != null && anchor.lon != null ? { lat: anchor.lat, lon: anchor.lon } : undefined)
  const dockSearch = useDockSearch(open && mode === "cycle", state.query, near)
  const docks = dockSearch.docks
  const chosen = new Set(chosenIds ?? [])

  if (!typed && pinnedRange) setPinnedRange(null)
  const anchorLat = anchor?.lat
  const anchorLon = anchor?.lon
  // Empty field: what is in the frame, led by the Board's place while it is in view.
  const browse = useMemo(() => {
    const kit = index?.kit
    if (!open || typed || !kit) return []
    const rows = browseRows(kit, frame)
    const isBoard = (row: StopRow) =>
      row.id === currentId ||
      (row.kind === "station" &&
        stationPointOfRow(row, stations, hubStationIds)?.id === currentId)
    if (currentId && rows.some(isBoard)) return leadWith(rows, isBoard)
    if (
      currentId ||
      anchorLat == null ||
      anchorLon == null ||
      !inFrame({ lat: anchorLat, lon: anchorLon }, frame)
    )
      return rows
    const away = (row: StopRow) =>
      distanceMeters(anchorLat, anchorLon, row.lat!, row.lon!)
    const nearest = rows.reduce<StopRow | undefined>(
      (best, row) => (!best || away(row) < away(best) ? row : best),
      undefined
    )
    return leadWith(rows, (row) => row === nearest)
  }, [
    open,
    typed,
    index,
    frame,
    currentId,
    anchorLat,
    anchorLon,
    stations,
    hubStationIds,
  ])
  // Match quality first, then in view: a strong match outside beats a weak one in view.
  const inFrameMatches = useMemo(() => {
    const found = index
      ? searchInFrame(index.kit, state.query, range, state.rows)
      : frameMatches(state.rows, range)
    return state.status !== "pending" &&
      !frameWins(state.query, found, state.rows, range)
      ? []
      : found
  }, [index, state.query, state.rows, state.status, range])
  // Typed: matches in the frame; with none there, the wider search, and the map fits to it once.
  // After our fit the map shows the best match's area: list what is in view there, so pins and list stay one set.
  const inViewMatches = useMemo(
    () =>
      index && typed && inFrameMatches.length === 0 && fit.key > 0
        ? searchInFrame(index.kit, state.query, frame, state.rows)
        : [],
    [
      index,
      typed,
      inFrameMatches.length,
      fit.key,
      state.query,
      state.rows,
      frame,
    ]
  )
  const listed = mode
    ? state.rows
    : !typed
    ? browse
    : inFrameMatches.length > 0
      ? inFrameMatches
      : inViewMatches.length > 0
        ? inViewMatches
        : state.rows
  // Bus stops no route serves have no arrivals: neither a pin nor a row.
  const rows = useMemo(() => servedRows(listed), [listed])
  const wideFit =
    open &&
    !mode &&
    typed &&
    state.status !== "pending" &&
    inFrameMatches.length === 0 &&
    fit.attempt !== state.attempt
      ? fitFor(strongestRows(state.rows, state.query))
      : null
  if (wideFit) {
    setFit({ attempt: state.attempt, ...wideFit, key: fit.key + 1 })
    setPinnedRange(range)
  }
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

  // Typed: the result stops stay pins at any zoom; the other stops in view are the dots below the pin zoom.
  const drawsDots = mode === undefined || mode === "bus"
  const resultPinIds = useMemo(
    () =>
      typed
        ? new Set(rows.filter((row) => row.kind === "bus").map((row) => row.id))
        : undefined,
    [typed, rows]
  )
  const busDots = useMemo(() => {
    const kit = index?.kit
    if (!open || !drawsDots || zoom >= PIN_MIN_ZOOM || !kit) return []
    const skip = typed
      ? new Set(
          rows
            .filter((row) => row.kind === "bus" && row.lat != null && row.lon != null)
            .map((row) => dotKey(row.lon!, row.lat!))
        )
      : undefined
    return busStopDots(kit, frame, skip)
  }, [open, drawsDots, zoom, index, typed, frame, rows])

  const close = () => {
    onOpenChange?.(false)
    setOpen(false)
    setActiveId(null)
    setExpanded({ query: "", clusters: [], all: false })
    // The map remounts on the next open; a stale fit key would move it.
    setFit(NO_FIT)
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
      option: {
        id: nested ? `${row.id}:in-cluster` : row.id,
        label: rowLabel(row),
      },
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
        if (mode === "bus" || mode === "cycle") {
          // Bus stops and docks list nearest first: point the list at you and open it.
          setLocated({ lat: coords.latitude, lon: coords.longitude })
          return
        }
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
    const station =
      row.kind === "station"
        ? stationPointOfRow(row, stations, hubStationIds)
        : undefined
    const modes: readonly string[] = station?.modes ?? row.modes
    const detail = chosen.has(row.id)
      ? "On the board"
      : row.kind === "station"
        ? [
            ...modes.flatMap((mode) =>
              MODE_LABELS[mode] ? [MODE_LABELS[mode]] : []
            ),
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
          <span className="flex min-w-0 items-center gap-2 text-lg leading-snug">
            <ListName name={row.name} />
            {row.kind === "bus" && row.letter ? (
              <StopLetterBadge letter={row.letter} size="sm" />
            ) : null}
          </span>
          {detail ? (
            <span className="block text-sm text-pretty text-muted-foreground">
              {detail}
            </span>
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
        <span className="flex min-w-0 text-lg leading-snug">
          <ListName name={dock.name} />
        </span>
        <span className="block text-sm text-pretty text-muted-foreground">
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
    // At rest and open it stacks over the Board's own layers and under the sticky site header.
    <div className="relative z-20">
      {/* Open: covers only the main area under the header; the nav stays visible and on top. */}
      <div
        className={
          open
            ? "fixed inset-x-0 top-(--site-header-height) bottom-0 flex justify-center bg-background"
            : undefined
        }
      >
        <div
          className={cn("flex w-full flex-col", open && "h-full max-w-3xl min-w-0")}
          style={open ? { paddingTop: openTop } : undefined}
        >
          <div className={cn(open && "shrink-0 px-4 sm:px-8")}>
            {/* Square hairline underline, no fill: the approved A5 field (the DROP SQUARE exception). */}
            <div
              ref={fieldRef}
              className="flex h-[4.5rem] items-center gap-3 border-b border-foreground bg-transparent sm:h-[5.5rem]"
            >
              {open ? (
                // Takes the magnifier's place, so opening never narrows or moves the input;
                // the padding grows the tap target without growing the layout.
                <button
                  type="button"
                  onClick={close}
                  className="-m-2 flex shrink-0 items-center border-0 bg-transparent p-2 text-foreground"
                >
                  <ArrowLeft className="size-7" aria-hidden />
                  <span className="sr-only">Cancel</span>
                </button>
              ) : (
                <Search className="size-7 shrink-0" aria-hidden />
              )}
              <input
                ref={inputRef}
                type="text"
                role="combobox"
                aria-label={mode ? MODE_COPY[mode].label : "Search a station or bus stop"}
                aria-expanded={open && options.length > 0}
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={
                  active >= 0 ? optionId(options[active]!.id) : undefined
                }
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="go"
                placeholder={open && mode ? MODE_COPY[mode].field : placeholder}
                value={open ? state.query : (restingValue ?? "")}
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
                    setActiveId(
                      options[
                        nextActiveIndex(active, event.key, options.length)
                      ]?.id ?? null
                    )
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
                className="h-12 min-w-0 flex-1 bg-transparent text-3xl leading-none text-foreground outline-none placeholder:[font-size:var(--placeholder-size,inherit)] placeholder:text-muted-foreground sm:h-16 sm:text-5xl"
              />
              {/* "Near me" picks the nearest station; in a bus or dock editor it lists the nearest. */}
              <button
                type="button"
                onClick={locate}
                className="flex min-h-11 shrink-0 items-center border-0 bg-transparent px-1 text-muted-foreground hover:text-foreground"
              >
                <LocateFixed className="size-5" aria-hidden />
                <span className="sr-only">Near me</span>
              </button>
            </div>
            {locateNote ? (
              <p
                role="status"
                className="pt-2 text-sm text-balance text-muted-foreground"
              >
                {locateNote}
              </p>
            ) : null}
          </div>
          {open ? (
            <>
              <div data-search-map className="relative min-h-0 flex-1">
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
                  busDots={busDots}
                  railLines
                  pinMinZoom={drawsDots ? PIN_MIN_ZOOM : undefined}
                  alwaysPinIds={resultPinIds}
                  initialView={{
                    lat: frame.center.lat,
                    lon: frame.center.lon,
                    zoom: MAP_SELECTED_ZOOM,
                  }}
                  onViewChange={(view) => {
                    const { center, bounds, byUser } = view
                    setFrame({ center, bounds })
                    setZoom(view.zoom)
                    if (byUser) setPinnedRange(null)
                  }}
                  followSelected={false}
                  fitSearchKey={fit.key}
                  searchOrigin={fit.origin}
                  searchRadiusMeters={fit.radiusMeters}
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
                    "flex min-h-16 items-center gap-3 px-4 py-2 sm:px-8",
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
                              {/* No stop letter beside it, so the name simply wraps in full. */}
                              <span className="block text-lg leading-snug text-pretty">
                                {entry.cluster.name.replace(/\s+/g, " ")}
                                <span className="text-sm text-muted-foreground">
                                  {" "}
                                  · bus
                                </span>
                              </span>
                              <span className="block text-sm text-pretty text-muted-foreground">
                                {entry.cluster.stops.length} stops
                                {entry.cluster.letters
                                  ? ` · ${entry.cluster.letters}`
                                  : ""}{" "}
                                ·{" "}
                                {entry.option.expanded
                                  ? "tap to close"
                                  : "tap to choose one"}
                              </span>
                            </span>
                            <RouteChips routes={entry.cluster.routes} max={9} />
                          </>
                        ) : null}
                      </li>
                    )
                  )}
                  {footer || hasMore ? (
                    <li
                      role="presentation"
                      className="flex min-h-11 items-center justify-between gap-3 py-2 text-sm text-muted-foreground"
                    >
                      <span className="text-balance" aria-live="polite">
                        {footer}
                      </span>
                      {hasMore ? (
                        <button
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() =>
                            setExpanded({
                              query: state.query,
                              clusters: shown.clusters,
                              all: true,
                            })
                          }
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
        {open && aside ? (
          <aside
            aria-label="Live status"
            className="hidden w-96 shrink-0 overflow-y-auto overscroll-contain border-l border-border px-6 pb-6 lg:block xl:w-[28rem]"
            style={{ paddingTop: openTop }}
          >
            {aside}
          </aside>
        ) : null}
      </div>
      {/* Holds the field's place in the page while the field sits in the open view. */}
      {open ? <div aria-hidden className="h-[4.5rem] sm:h-[5.5rem]" /> : null}
    </div>
  )
}
