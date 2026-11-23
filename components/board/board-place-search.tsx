"use client"

import { useEffect, useId, useMemo, useState } from "react"
import { LocateFixed, PlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { StopLetterBadge } from "@/components/tfl/arrivals/stop-letter-badge"
import { getNearbyBusStops } from "@/lib/tfl/actions"
import {
  getBoardPlaceLabel,
  getBoardRiverPiers,
  searchBoardPlaces,
  type BoardPlaceHit,
  type BoardPlaceKind,
} from "@/lib/tfl/board-place-search-action"
import { getGeolocation } from "@/hooks/use-explorer-keyed-query"

type BoardPlaceSearchProps = {
  kind: Exclude<BoardPlaceKind, "cycle">
  selectedId?: string
  onSelect: (place: BoardPlaceHit) => void
  inputId: string
  placeholder: string
  emptyMessage: string
  /**
   * Add mode (bus): a list being built, not one pick. Searches as you type,
   * each result reads "Added" or has +, and nothing is shown as selected.
   */
  addedIds?: readonly string[]
}

const SEARCH_DELAY_MS = 300

const PlaceIdentity = ({ place }: { place: BoardPlaceHit }) => (
  <span className="flex min-w-0 items-center gap-2">
    <span className="flex min-w-0 items-center gap-1.5">
      <span className="truncate font-medium">{place.name}</span>
      {place.stopLetter ? (
        <StopLetterBadge letter={place.stopLetter} size="sm" />
      ) : null}
    </span>
    <code className="ml-auto shrink-0 text-xs text-muted-foreground">
      {place.id}
    </code>
  </span>
)

const SelectedPlaceBox = ({
  place,
  fallbackId,
  emptyLabel,
}: {
  place: BoardPlaceHit | null
  fallbackId?: string
  emptyLabel: string
}) => (
  <div className="rounded-xl border border-input bg-muted/20 px-3 py-2">
    {place ? (
      <>
        <PlaceIdentity place={place} />
        {place.context ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{place.context}</p>
        ) : null}
      </>
    ) : fallbackId ? (
      <code className="text-xs text-muted-foreground">{fallbackId}</code>
    ) : (
      <p className="text-sm text-muted-foreground">{emptyLabel}</p>
    )}
  </div>
)

const resolvePlacePick = (
  value: unknown,
  catalogue: readonly BoardPlaceHit[]
): BoardPlaceHit | undefined => {
  if (value == null) return undefined
  if (typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>
    const id = typeof record.id === "string" ? record.id.trim() : ""
    if (!id) return undefined
    return catalogue.find((place) => place.id === id) ?? {
      id,
      name: typeof record.name === "string" ? record.name : id,
      context: typeof record.context === "string" ? record.context : undefined,
      stopLetter:
        typeof record.stopLetter === "string" ? record.stopLetter : undefined,
    }
  }
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  if (trimmed.startsWith("{")) {
    try {
      return resolvePlacePick(JSON.parse(trimmed) as unknown, catalogue)
    } catch {
      return undefined
    }
  }
  return catalogue.find((place) => place.id === trimmed)
}

export const BoardPlaceSearch = ({
  kind,
  selectedId,
  onSelect,
  inputId,
  placeholder,
  emptyMessage,
  addedIds,
}: BoardPlaceSearchProps) => {
  const adding = addedIds !== undefined
  const listId = useId()
  const [query, setQuery] = useState("")
  const [places, setPlaces] = useState<BoardPlaceHit[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<BoardPlaceHit | null>(null)
  const [piers, setPiers] = useState<BoardPlaceHit[]>([])

  useEffect(() => {
    if (kind !== "river") return
    let cancelled = false
    void getBoardRiverPiers().then((result) => {
      if (cancelled || !result.ok) return
      setPiers(result.places)
    })
    return () => {
      cancelled = true
    }
  }, [kind])

  if (!selectedId) {
    if (selected) setSelected(null)
  } else if (selected?.id !== selectedId) {
    const fromPiers = piers.find((pier) => pier.id === selectedId)
    if (fromPiers) setSelected(fromPiers)
  }

  useEffect(() => {
    if (!selectedId) return
    if (selected?.id === selectedId) return
    if (piers.some((pier) => pier.id === selectedId)) return
    let cancelled = false
    void getBoardPlaceLabel(kind, selectedId).then((result) => {
      if (cancelled || !result.ok) return
      setSelected(result.place)
    })
    return () => {
      cancelled = true
    }
  }, [kind, piers, selected?.id, selectedId])

  const riverItems = useMemo(() => {
    const trimmed = query.trim().toLowerCase()
    if (!trimmed) return piers
    return piers.filter(
      (pier) =>
        pier.name.toLowerCase().includes(trimmed) ||
        pier.id.toLowerCase().includes(trimmed) ||
        (pier.context?.toLowerCase().includes(trimmed) ?? false)
    )
  }, [piers, query])

  useEffect(() => {
    if (!adding) return
    const trimmed = query.trim()
    if (trimmed.length < 2) return
    let cancelled = false
    const timer = window.setTimeout(() => {
      setBusy(true)
      void searchBoardPlaces(kind, trimmed).then((result) => {
        if (cancelled) return
        setBusy(false)
        setPlaces(result.ok ? result.places : [])
        setError(
          !result.ok
            ? result.error
            : result.places.length === 0
              ? emptyMessage
              : null
        )
      })
    }, SEARCH_DELAY_MS)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [adding, emptyMessage, kind, query])

  const handleSelect = (
    place: BoardPlaceHit,
    options?: { keepResults?: boolean }
  ) => {
    if (!place.id) return
    setSelected(place)
    if (!options?.keepResults) {
      setQuery("")
      setPlaces([])
    }
    setError(null)
    onSelect(place)
  }

  const handleSearch = async () => {
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setError("Enter at least 2 characters to search.")
      setPlaces([])
      return
    }
    setBusy(true)
    setError(null)
    const result = await searchBoardPlaces(kind, trimmed)
    setBusy(false)
    if (!result.ok) {
      setPlaces([])
      setError(result.error)
      return
    }
    setPlaces(result.places)
    if (result.places.length === 0) setError(emptyMessage)
  }

  const handleLocate = async () => {
    setBusy(true)
    setError(null)
    try {
      const origin = await getGeolocation()
      const result = await getNearbyBusStops(origin.lat, origin.lon)
      setBusy(false)
      if (!result.ok) {
        setPlaces([])
        setError(
          result.error.startsWith("No bus stops")
            ? "No bus stops nearby."
            : result.error
        )
        return
      }
      const nearby = result.stops.map((stop) => ({
        id: stop.id,
        name: stop.name,
        stopLetter: stop.stopLetter,
        context: stop.towards ? `towards ${stop.towards}` : undefined,
      }))
      setPlaces(nearby)
      const nearest = nearby[0]
      if (nearest) handleSelect(nearest, { keepResults: true })
    } catch (err) {
      setBusy(false)
      setPlaces([])
      setError(
        err instanceof Error ? err.message : "Could not read location."
      )
    }
  }

  if (adding) {
    const typed = query.trim().length >= 2
    return (
      <div className="space-y-2">
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          autoComplete="off"
          spellCheck={false}
          autoFocus
          placeholder={placeholder}
          aria-controls={listId}
          className="flex min-h-11 w-full border border-input bg-transparent px-3 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
        />
        {typed && (busy || error) ? (
          <p role="status" className="text-sm text-muted-foreground">
            {busy ? "Searching…" : error}
          </p>
        ) : null}
        {typed && places.length > 0 ? (
          <ul
            id={listId}
            aria-label="Search results"
            className="border-y border-border"
          >
            {places.map((place) => {
              const added = addedIds.includes(place.id)
              return (
                <li
                  key={place.id}
                  className="flex min-h-12 items-center justify-between gap-3 border-b border-border py-1 last:border-b-0"
                >
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 text-sm font-medium">
                      <span className="truncate">{place.name}</span>
                      {place.stopLetter ? (
                        <StopLetterBadge letter={place.stopLetter} size="sm" />
                      ) : null}
                    </span>
                    {place.context ? (
                      <span className="block truncate text-sm text-muted-foreground">
                        {place.context}
                      </span>
                    ) : null}
                  </span>
                  {added ? (
                    <span className="shrink-0 text-sm">Added</span>
                  ) : (
                    <button
                      type="button"
                      aria-label={`Add ${place.name}${place.stopLetter ? ` stop ${place.stopLetter}` : ""}`}
                      className="inline-flex size-11 shrink-0 items-center justify-center outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                      onClick={() => onSelect(place)}
                    >
                      <PlusIcon className="size-5" aria-hidden />
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        ) : null}
      </div>
    )
  }

  if (kind === "river") {
    const value =
      selected?.id === selectedId
        ? selected
        : (piers.find((pier) => pier.id === selectedId) ?? null)
    return (
      <div className="space-y-2">
        <SelectedPlaceBox
          place={value}
          fallbackId={selectedId}
          emptyLabel="No pier yet"
        />
        <Combobox
          items={[...riverItems]}
          value={value}
          onValueChange={(place) => {
            const resolved = resolvePlacePick(place, piers)
            if (resolved) handleSelect(resolved)
          }}
          inputValue={query}
          onInputValueChange={setQuery}
          itemToStringLabel={(item) => item.name}
          itemToStringValue={(item) => item.id}
          isItemEqualToValue={(item, current) => item.id === current.id}
          filter={null}
        >
          <ComboboxInput
            id={inputId}
            placeholder={placeholder}
            className="w-full"
            showClear={query.length > 0}
          />
          <ComboboxContent>
            <ComboboxEmpty>{emptyMessage}</ComboboxEmpty>
            <ComboboxList>
              {(item) => (
                <ComboboxItem key={item.id} value={item}>
                  <span className="flex min-w-0 flex-col">
                    <PlaceIdentity place={item} />
                    {item.context ? (
                      <span className="text-xs text-muted-foreground">
                        {item.context}
                      </span>
                    ) : null}
                  </span>
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <SelectedPlaceBox
        place={selected?.id === selectedId ? selected : null}
        fallbackId={selectedId}
        emptyLabel="No bus stop yet"
      />
      <div className="flex gap-2">
        <InputGroup className="h-9 min-w-0 flex-1">
          <InputGroupInput
            id={inputId}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                void handleSearch()
              }
            }}
            autoComplete="off"
            spellCheck={false}
            placeholder={placeholder}
            aria-controls={listId}
            aria-expanded={places.length > 0}
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              type="button"
              size="icon-xs"
              aria-label="Use my location"
              disabled={busy}
              onClick={() => void handleLocate()}
              className="h-full w-8 rounded-[calc(var(--radius-lg)-2px)]"
            >
              <LocateFixed className="size-4" aria-hidden />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
        <Button
          type="button"
          variant="outline"
          onClick={() => void handleSearch()}
          disabled={busy}
        >
          {busy ? "Searching…" : "Search"}
        </Button>
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {places.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          aria-label="Search results"
          className="divide-y divide-border rounded-lg border border-border"
        >
          {places.map((place) => (
            <li key={place.id} role="option" aria-selected="false">
              <button
                type="button"
                className="flex w-full flex-col items-stretch px-3 py-2 text-left text-sm hover:bg-muted"
                onClick={() => handleSelect(place)}
                aria-label={`Use ${place.name}`}
              >
                <PlaceIdentity place={place} />
                {place.context ? (
                  <span className="text-xs text-muted-foreground">
                    {place.context}
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
