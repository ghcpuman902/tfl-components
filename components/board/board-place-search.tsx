"use client"

import { useEffect, useId, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  searchBoardPlaces,
  type BoardPlaceHit,
  type BoardPlaceKind,
} from "@/lib/tfl/board-place-search-action"

type BoardPlaceSearchProps = {
  kind: BoardPlaceKind
  selectedId?: string
  onSelect: (place: BoardPlaceHit) => void
  inputId: string
  placeholder: string
  emptyMessage: string
}

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
  const [pickedName, setPickedName] = useState<string | undefined>()

  useEffect(() => {
    if (!selectedId) setPickedName(undefined)
  }, [selectedId])

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
    if (result.places.length === 0) {
      setError(emptyMessage)
    }
  }

  const handleSelect = (place: BoardPlaceHit) => {
    setPickedName(place.name)
    setQuery("")
    setPlaces([])
    setError(null)
    onSelect(place)
  }

  return (
    <div className="space-y-2">
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
      {selectedId ? (
        <p className="text-sm text-foreground">
          {pickedName ?? selectedId}
          <span className="ml-2 font-mono text-xs text-muted-foreground">
            {selectedId}
          </span>
        </p>
      ) : null}
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
                ) : (
                  <span className="font-mono text-xs text-muted-foreground">
                    {place.id}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
