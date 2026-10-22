"use client"

import { useMemo, useRef, useState, type KeyboardEvent } from "react"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import {
  displayBoardStationValue,
  matchBoardStationSearchItem,
  matchBoardStationSearchQuery,
  parseBoardStationPick,
  resolveBoardStationCommit,
  resolveBoardStationQuery,
  type BoardStationSearchItem,
} from "@/lib/tfl/board-station-names"

const PICK_FROM_LIST = "Pick a station from the list."

type BoardStationSearchProps = {
  stations: readonly BoardStationSearchItem[]
  stopId: string | undefined
  onStopChange: (stopId: string) => void
}

export const BoardStationSearch = ({
  stations,
  stopId,
  onStopChange,
}: BoardStationSearchProps) => {
  const selected = matchBoardStationSearchItem(stations, stopId)
  const [query, setQuery] = useState("")
  const [invalidMessage, setInvalidMessage] = useState<string | null>(null)
  const unknownStop = Boolean(stopId?.trim()) && !selected
  const inputValue = displayBoardStationValue(
    selected,
    unknownStop ? (stopId ?? "") : query
  )

  const items = useMemo(
    () =>
      stations.filter((item) => matchBoardStationSearchQuery(item, inputValue)),
    [inputValue, stations]
  )

  const handleResolvedStop = (nextId: string) => {
    onStopChange(nextId)
    setInvalidMessage(null)
  }

  const handleValueChange = (value: BoardStationSearchItem | null) => {
    const pick = parseBoardStationPick(value)
    if (!pick) {
      handleResolvedStop("")
      setQuery("")
      return
    }
    const resolved = resolveBoardStationQuery(stations, pick.id)
    if (resolved.status === "match") {
      handleResolvedStop(resolved.item.id)
      setQuery(resolved.item.name)
      return
    }
    handleResolvedStop(pick.id)
    setQuery(pick.name ?? "")
  }

  const highlightedRef = useRef<BoardStationSearchItem | undefined>(undefined)

  // Typed text the visitor did not pick from the list (Enter, Go, blur, close).
  const commitTypedQuery = () => {
    if (selected || !query.trim()) return
    const item = resolveBoardStationCommit(stations, query)
    if (item) {
      handleResolvedStop(item.id)
      setQuery(item.name)
      return
    }
    if (!invalidMessage) setInvalidMessage(PICK_FROM_LIST)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !highlightedRef.current) commitTypedQuery()
  }

  const handleInputValueChange = (
    value: string,
    details?: { reason?: string }
  ) => {
    const resolved = resolveBoardStationQuery(stations, value)
    if (resolved.status === "match") {
      handleResolvedStop(resolved.item.id)
      setQuery(resolved.item.name)
      return
    }

    if (resolved.status === "unknown-id") {
      if (stopId) handleResolvedStop("")
      setQuery(value)
      setInvalidMessage(
        "This Stop ID is not in the station list. Check the ID, or search by name."
      )
      return
    }

    // Closing with nothing picked resets the input to the empty selection;
    // keep the visitor's text so it can still be committed or corrected.
    if (details?.reason === "input-clear" && !selected && query.trim()) return

    const trimmed = value.trim()
    setQuery(value)
    setInvalidMessage(null)

    // Combobox fills the input after a pick (`item-press`) and when syncing
    // the selected label (`none`). Those must not clear the Stop ID.
    if (details?.reason === "item-press" || details?.reason === "none") return

    if (!selected) return
    if (trimmed.toLowerCase() === selected.name.toLowerCase()) return
    handleResolvedStop("")
  }

  const showError = invalidMessage || unknownStop

  return (
    <div className="space-y-2">
      <Combobox
        items={[...items]}
        value={selected ?? null}
        onValueChange={handleValueChange}
        inputValue={inputValue}
        onInputValueChange={handleInputValueChange}
        itemToStringLabel={(item) => item.name}
        itemToStringValue={(item) => item.id}
        isItemEqualToValue={(item, value) => item.id === value.id}
        filter={null}
        onItemHighlighted={(item) => {
          highlightedRef.current = item ?? undefined
        }}
        onOpenChange={(open, details) => {
          if (!open && details.reason !== "item-press") commitTypedQuery()
        }}
      >
        <ComboboxInput
          id="board-station"
          placeholder="Station name or Stop ID"
          className="w-full"
          showClear={inputValue.length > 0}
          onKeyDown={handleKeyDown}
          onBlur={commitTypedQuery}
          aria-invalid={showError ? true : undefined}
          aria-describedby={showError ? "board-station-error" : undefined}
        />
        <ComboboxContent>
          <ComboboxEmpty>No stations match that name or Stop ID.</ComboboxEmpty>
          <ComboboxList>
            {(item) => (
              <ComboboxItem key={item.id} value={item}>
                <span className="flex min-w-0 flex-col">
                  <span>{item.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {item.context}
                  </span>
                </span>
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      {showError ? (
        <p
          id="board-station-error"
          className="text-sm text-destructive"
          role="alert"
        >
          {invalidMessage ??
            "This Stop ID is not in the station list. Check the ID, or search by name."}
        </p>
      ) : null}
    </div>
  )
}
