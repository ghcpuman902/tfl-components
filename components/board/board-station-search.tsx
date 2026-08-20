"use client"

import { useMemo, useState } from "react"
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
  parseBoardStationPick,
  resolveBoardStationQuery,
  type BoardStationSearchItem,
} from "@/lib/tfl/board-station-names"

type BoardStationSearchProps = {
  stations: readonly BoardStationSearchItem[]
  stopId: string | undefined
  onStopChange: (stopId: string) => void
}

const matchesQuery = (item: BoardStationSearchItem, query: string): boolean => {
  const q = query.trim().toLowerCase()
  if (!q) return true
  if (item.name.toLowerCase().includes(q)) return true
  if (item.context.toLowerCase().includes(q)) return true
  if (item.id.toLowerCase().includes(q)) return true
  return item.aliasIds.some((alias) => alias.toLowerCase().includes(q))
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
    () => stations.filter((item) => matchesQuery(item, inputValue)),
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
      >
        <ComboboxInput
          id="board-station"
          placeholder="Station name or Stop ID"
          className="w-full"
          showClear={inputValue.length > 0}
          aria-invalid={showError ? true : undefined}
          aria-describedby={
            showError
              ? "board-station-error board-station-hint"
              : "board-station-hint"
          }
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
      <p id="board-station-hint" className="text-sm text-muted-foreground">
        Type a station name for matches, or paste a TfL Stop ID. Results include
        the mode or lines that distinguish similar names.
      </p>
    </div>
  )
}
