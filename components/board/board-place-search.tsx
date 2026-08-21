"use client"

import { useEffect, useId, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import { Input } from "@/components/ui/input"
import {
  getBoardPlaceLabel,
  getBoardRiverPiers,
  searchBoardPlaces,
  type BoardPlaceHit,
  type BoardPlaceKind,
} from "@/lib/tfl/board-place-search-action"

type BoardPlaceSearchProps = {
  kind: Exclude<BoardPlaceKind, "cycle">
  selectedId?: string
  onSelect: (place: BoardPlaceHit) => void
  inputId: string
  placeholder: string
  emptyMessage: string
}

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
    {place || fallbackId ? (
      <>
        <p className="text-sm font-medium text-foreground">
          {place?.name ?? fallbackId}
        </p>
        {place?.context ? (
          <p className="text-xs text-muted-foreground">{place.context}</p>
        ) : null}
      </>
    ) : (
      <p className="text-sm text-muted-foreground">{emptyLabel}</p>
    )}
  </div>
)

export const BoardPlaceSearch = ({
  kind,
  selectedId,
  onSelect,
  inputId,
  placeholder,
  emptyMessage,
}: BoardPlaceSearchProps) => {
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

  useEffect(() => {
    if (!selectedId) {
      setSelected(null)
      return
    }
    if (selected?.id === selectedId) return
    const fromPiers = piers.find((pier) => pier.id === selectedId)
    if (fromPiers) {
      setSelected(fromPiers)
      return
    }
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

  const handleSelect = (place: BoardPlaceHit) => {
    setSelected(place)
    setQuery("")
    setPlaces([])
    setError(null)
    onSelect(place)
  }

  if (kind === "river") {
    const value = selected?.id === selectedId ? selected : null
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
            if (place) handleSelect(place)
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
                    <span>{item.name}</span>
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
        <Input
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
            <li key={place.id} role="option">
              <button
                type="button"
                className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-muted"
                onClick={() => handleSelect(place)}
                aria-label={`Use ${place.name}`}
              >
                <span>{place.name}</span>
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
