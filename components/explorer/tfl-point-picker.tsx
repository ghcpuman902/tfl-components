"use client"

/**
 * TfLPointPicker — controlled, props-only point search / browse UI.
 *
 * Owns:
 * - search input UI (optional Search / Enter submission; omit for type-to-filter)
 * - locate action UI
 * - filters slot
 * - loading / empty / error states
 * - list / map view switching
 * - keyboard navigation
 * - result selection
 * - accessible labels and focus behaviour
 * - responsive layout
 *
 * Does NOT own:
 * - credentials
 * - tfl-ts client creation
 * - Server Actions
 * - browser storage
 * - data fetching
 * - key policy
 * - a hard dependency on MapLibre
 *
 * Site-owned for now — not published to the registry.
 */

import {
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from "react"
import {
  Check,
  CirclePlus,
  List,
  Loader2,
  LocateFixed,
  Map as MapIcon,
  Search,
} from "lucide-react"
import {
  explorerPaneClassName,
  explorerPaneItemClassName,
  explorerResultsPaneClassName,
  explorerSplitFillClassName,
} from "@/components/explorer/explorer-split"
import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { cn } from "@/lib/utils"
import { StopLetterBadge } from "@/components/tfl/arrivals/stop-letter-badge"
import type { ExplorerPoint } from "@/lib/tfl/explorer-point-normalise"
import type { ExplorerView } from "@/lib/tfl/explorer-url-state"

export type TfLPointPickerMapRenderProps = {
  points: readonly ExplorerPoint[]
  selectedId?: string | null
  onSelect: (point: ExplorerPoint) => void
  className?: string
}

export type TfLPointPickerProps = {
  points: readonly ExplorerPoint[]
  selectedId?: string | null
  /** Second arg is the live search box value so navigation can keep `q`. */
  onSelect: (point: ExplorerPoint, query?: string) => void
  /**
   * Fires only on Search click or Enter. Omit when typing already filters
   * a complete local catalogue — Enter then does nothing.
   * Return `false` when the query was not actually sent (no key, validation)
   * so Search stays enabled for a retry.
   */
  onSearchSubmit?: (
    query: string
  ) => void | boolean | Promise<void | boolean>
  /** Omit to hide the locate button entirely. */
  onLocate?: () => void
  loading?: boolean
  error?: string | null
  emptyMessage?: string
  view: ExplorerView
  onViewChange: (view: ExplorerView) => void
  renderMap?: (props: TfLPointPickerMapRenderProps) => ReactNode
  filters?: ReactNode
  searchPlaceholder?: string
  searchValue?: string
  onSearchValueChange?: (value: string) => void
  /** Metres from a geo target. Bus name search leaves this off. */
  showDistance?: boolean
  /** Ids already added — used with `addable` for a plus / added hint. */
  addedIds?: readonly string[]
  /** Hover shows a plus; added ids show a check. */
  addable?: boolean
  className?: string
}

/**
 * Scroll only the results list — never the page — when the selected
 * point is off-screen. `scrollIntoView` would also move `html`.
 */
const scrollSelectedIntoPane = (
  container: HTMLElement,
  item: HTMLElement
) => {
  if (container.clientHeight === 0) return

  const itemRect = item.getBoundingClientRect()
  const paneRect = container.getBoundingClientRect()
  const fullyVisible =
    itemRect.top >= paneRect.top && itemRect.bottom <= paneRect.bottom
  if (fullyVisible) return

  const offset = itemRect.top - paneRect.top + container.scrollTop
  const top = offset - (container.clientHeight - item.offsetHeight) / 2
  container.scrollTo({ top: Math.max(0, top) })
}

const formatDistance = (meters?: number): string => {
  if (meters === undefined) return ""
  if (meters < 1000) return `${Math.round(meters)}m`
  return `${(meters / 1000).toFixed(1)}km`
}

const SEARCH_INPUT_CLASS =
  "appearance-none [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"

type PointResultOptionProps = {
  point: ExplorerPoint
  selected: boolean
  added: boolean
  addable: boolean
  active: boolean
  onSelect: (point: ExplorerPoint) => void
  showDistance: boolean
  optionRef?: Ref<HTMLButtonElement>
}

const PointResultOption = ({
  point,
  selected,
  added,
  addable,
  active,
  onSelect,
  showDistance,
  optionRef,
}: PointResultOptionProps) => {
  const isBus = point.modes?.includes("bus") ?? false
  const stopLetter = isBus ? point.stopLetter : undefined
  const meta = [
    point.hubMembers && point.hubMembers.length > 1
      ? `${point.hubMembers.length} StopPoints`
      : null,
    point.towards ? `towards ${point.towards}` : null,
    showDistance && point.distanceMeters !== undefined
      ? formatDistance(point.distanceMeters)
      : null,
    point.bikes !== undefined ? `${point.bikes} bikes` : null,
  ].filter(Boolean)
  const marked = selected || added

  return (
    <button
      ref={optionRef}
      type="button"
      role="option"
      aria-selected={marked}
      tabIndex={active ? 0 : -1}
      onClick={() => onSelect(point)}
      aria-label={[
        addable ? (added ? "Added" : "Add") : null,
        point.name,
        stopLetter ? `stop ${stopLetter}` : null,
        point.towards ? `towards ${point.towards}` : null,
      ]
        .filter(Boolean)
        .join(", ")}
      className={cn(
        "group/result flex w-full flex-col gap-0.5 px-3 py-2 text-left text-sm transition-colors",
        "[contain-intrinsic-size:auto_3.25rem] [content-visibility:auto]",
        selected && "[content-visibility:visible]",
        explorerPaneItemClassName,
        "hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset",
        marked && "bg-muted ring-1 ring-primary ring-inset",
        active && !marked && "bg-muted/40"
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate font-medium">{point.name}</span>
          {stopLetter ? (
            <StopLetterBadge letter={stopLetter} size="sm" />
          ) : null}
        </span>
        <code className="ml-auto shrink-0 text-xs text-muted-foreground">
          {point.id}
        </code>
        {addable ? (
          added ? (
            <Check
              className="size-4 shrink-0 text-primary"
              aria-hidden
            />
          ) : (
            <CirclePlus
              className="size-4 shrink-0 text-primary opacity-0 transition-opacity group-hover/result:opacity-100 group-focus-visible/result:opacity-100"
              aria-hidden
            />
          )
        ) : null}
      </span>
      {meta.length > 0 ? (
        <span className="text-xs text-muted-foreground">
          {meta.join(" · ")}
        </span>
      ) : null}
    </button>
  )
}

export const TfLPointPicker = ({
  points,
  selectedId,
  onSelect,
  onSearchSubmit,
  onLocate,
  loading = false,
  error = null,
  emptyMessage = "No points to show.",
  view,
  onViewChange,
  renderMap,
  filters,
  searchPlaceholder = "Search by name or ID",
  searchValue,
  onSearchValueChange,
  showDistance = true,
  addedIds,
  addable = false,
  className,
}: TfLPointPickerProps) => {
  const listId = useId()
  const added = useMemo(
    () => new Set(addedIds ?? []),
    [addedIds]
  )
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const selectedOptionRef = useRef<HTMLButtonElement>(null)
  const [internalQuery, setInternalQuery] = useState("")

  const query = searchValue ?? internalQuery
  const setQuery = onSearchValueChange ?? setInternalQuery
  const handleSelect = (point: ExplorerPoint) => {
    onSelect(point, query)
  }
  const [submittedQuery, setSubmittedQuery] = useState<string | null>(null)
  const trimmedQuery = query.trim()
  const canSearch =
    Boolean(onSearchSubmit) &&
    trimmedQuery.length > 0 &&
    trimmedQuery !== submittedQuery &&
    !loading
  const showSearchButton = Boolean(onSearchSubmit)
  const showViewToggle = Boolean(renderMap)

  const selectedIndex = points.findIndex((point) => point.id === selectedId)
  const [activeIndex, setActiveIndex] = useState(
    selectedIndex >= 0 ? selectedIndex : 0
  )
  const resolvedActiveIndex =
    selectedIndex >= 0
      ? selectedIndex
      : Math.min(activeIndex, Math.max(points.length - 1, 0))

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!onSearchSubmit || !canSearch) return
    const sent = await onSearchSubmit(query)
    if (sent === false) return
    setSubmittedQuery(trimmedQuery)
  }

  const handleListKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    if (points.length === 0) return

    if (event.key === "ArrowDown") {
      event.preventDefault()
      setActiveIndex((current) => {
        const base = selectedIndex >= 0 ? selectedIndex : current
        return (base + 1) % points.length
      })
      return
    }
    if (event.key === "ArrowUp") {
      event.preventDefault()
      setActiveIndex((current) => {
        const base = selectedIndex >= 0 ? selectedIndex : current
        return (base - 1 + points.length) % points.length
      })
      return
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      const point = points[resolvedActiveIndex]
      if (point) handleSelect(point)
    }
  }

  useLayoutEffect(() => {
    const pane = listRef.current
    const item = selectedOptionRef.current
    if (!pane || !item || !selectedId) return

    scrollSelectedIntoPane(pane, item)
    if (pane.clientHeight > 0) return

    const frame = requestAnimationFrame(() => {
      scrollSelectedIntoPane(pane, item)
    })
    return () => cancelAnimationFrame(frame)
  }, [selectedId])

  const showMap = view === "map" && renderMap

  const paneClassName = cn(explorerPaneClassName, explorerResultsPaneClassName)

  return (
    <div
      className={cn(
        "flex min-h-0 min-w-0 flex-col gap-3",
        explorerSplitFillClassName,
        className
      )}
    >
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-2 sm:h-9 sm:flex-row sm:items-stretch"
        role="search"
      >
        <InputGroup className="h-9 min-w-0 flex-1">
          <InputGroupAddon align="inline-start">
            <span className="relative inline-flex size-4 shrink-0" aria-hidden>
              <Search
                className={cn(
                  "size-4 transition-opacity duration-200",
                  loading ? "opacity-0" : "opacity-100"
                )}
              />
              <Loader2
                className={cn(
                  "absolute inset-0 size-4 transition-opacity duration-200",
                  loading ? "opacity-100 motion-safe:animate-spin" : "opacity-0"
                )}
              />
            </span>
          </InputGroupAddon>
          <InputGroupInput
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            aria-controls={listId}
            disabled={loading}
            autoComplete="off"
            className={SEARCH_INPUT_CLASS}
          />
          {onLocate ? (
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                type="button"
                size="icon-xs"
                aria-label="Use my location"
                disabled={loading}
                onClick={onLocate}
                className="h-full w-8 rounded-[calc(var(--radius-lg)-2px)]"
              >
                <LocateFixed className="size-4" aria-hidden />
              </InputGroupButton>
            </InputGroupAddon>
          ) : null}
        </InputGroup>

        {showSearchButton || showViewToggle ? (
          <div className="flex h-9 shrink-0 items-stretch gap-2">
            {showSearchButton ? (
              <Button
                type="submit"
                size="lg"
                disabled={!canSearch}
                aria-busy={loading}
              >
                Search
              </Button>
            ) : null}

            {showViewToggle ? (
              <div
                className="inline-flex h-9 items-stretch rounded-lg border border-border p-0.5"
                role="group"
                aria-label="Results view"
              >
                <Button
                  type="button"
                  size="sm"
                  variant={view === "list" ? "secondary" : "ghost"}
                  aria-pressed={view === "list"}
                  className="h-full rounded-[calc(var(--radius-lg)-2px)]"
                  onClick={() => onViewChange("list")}
                >
                  <List className="size-4" aria-hidden />
                  <span className="sr-only sm:not-sr-only">List</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={view === "map" ? "secondary" : "ghost"}
                  aria-pressed={view === "map"}
                  className="h-full rounded-[calc(var(--radius-lg)-2px)]"
                  onClick={() => onViewChange("map")}
                >
                  <MapIcon className="size-4" aria-hidden />
                  <span className="sr-only sm:not-sr-only">Map</span>
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </form>

      {filters ? <div className="space-y-2">{filters}</div> : null}

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {showMap ? (
        renderMap({
          points,
          selectedId,
          onSelect: handleSelect,
          className: paneClassName,
        })
      ) : points.length === 0 && !loading ? (
        <div
          className={cn(paneClassName, "flex items-center p-4")}
          aria-live="polite"
          aria-busy={loading}
        >
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      ) : (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label="Point results"
          tabIndex={0}
          aria-busy={loading}
          onKeyDown={handleListKeyDown}
          className={cn(
            paneClassName,
            "scrollbar-thin space-y-1 overflow-y-auto overscroll-y-auto p-1"
          )}
        >
          {points.map((point, index) => (
            <PointResultOption
              key={point.id}
              point={point}
              selected={point.id === selectedId}
              added={added.has(point.id)}
              addable={addable}
              active={index === resolvedActiveIndex}
              onSelect={handleSelect}
              showDistance={showDistance}
              optionRef={
                point.id === selectedId ? selectedOptionRef : undefined
              }
            />
          ))}
        </ul>
      )}
    </div>
  )
}
