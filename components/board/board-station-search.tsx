"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import {
  matchBoardStationSearchItem,
  parseBoardStationPick,
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
  const unknownStop = Boolean(stopId?.trim()) && !selected
  const inputValue = selected?.name ?? (unknownStop ? (stopId ?? "") : query)

  const items = useMemo(
    () => stations.filter((item) => matchesQuery(item, inputValue)),
    [inputValue, stations],
  )

  const handleValueChange = (value: BoardStationSearchItem | null) => {
    const pick = parseBoardStationPick(value)
    if (!pick) {
      onStopChange("")
      setQuery("")
      return
    }
    onStopChange(pick.id)
    setQuery(pick.name ?? "")
  }

  useEffect(() => {
    if (!query.trim().startsWith("{")) return
    const pick = parseBoardStationPick(query)
    if (!pick) return
    onStopChange(pick.id)
    setQuery(pick.name ?? pick.id)
  }, [onStopChange, query])

  const handleInputValueChange = (
    value: string,
    details?: { reason?: string },
  ) => {
    const trimmed = value.trim()
    if (trimmed.startsWith("{")) {
      const pick = parseBoardStationPick(trimmed)
      if (pick) {
        onStopChange(pick.id)
        setQuery(pick.name ?? pick.id)
        return
      }
    }

    setQuery(value)

    // Combobox fills the input after a pick (`item-press`) and when syncing
    // the selected label (`none`). Those must not clear the Stop ID.
    if (details?.reason === "item-press" || details?.reason === "none") return

    if (!selected) return
    if (trimmed.toLowerCase() === selected.name.toLowerCase()) return
    onStopChange("")
  }

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
          placeholder="Search for a station"
          className="w-full"
          showClear={inputValue.length > 0}
          aria-describedby={
            unknownStop
              ? "board-station-unknown board-station-hint"
              : "board-station-hint"
          }
        />
        <ComboboxContent>
          <ComboboxEmpty>No stations match that name.</ComboboxEmpty>
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
      {unknownStop ? (
        <p
          id="board-station-unknown"
          className="text-sm text-destructive"
          role="alert"
        >
          This Stop ID is not in the station list. Search by name, or keep the
          ID if you know it is valid.
        </p>
      ) : null}
      <p id="board-station-hint" className="text-sm text-muted-foreground">
        Pick a station. Similar names include the lines or modes that
        distinguish them.
      </p>
    </div>
  )
}
