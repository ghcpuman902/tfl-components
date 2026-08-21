"use client"

import { useEffect, useMemo, useState } from "react"
import { CirclePlus } from "lucide-react"
import { BoardChipListEditor } from "@/components/board/board-chip-list-editor"
import { CyclePointFinder } from "@/components/explorer/cycle-point-finder"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatBikePointId } from "@/lib/tfl/board-panels"
import { getBoardNearbyPlacesForStop } from "@/lib/tfl/board-nearby-action"
import { getBoardCycleDockLabels } from "@/lib/tfl/board-place-search-action"
import type { ExplorerPoint } from "@/lib/tfl/explorer-point-normalise"
import type { ExplorerView } from "@/lib/tfl/explorer-url-state"

const dockLabelFallback = (id: string): string =>
  id.startsWith("BikePoints_") ? id.slice("BikePoints_".length) : id

type BoardCycleDockPickerProps = {
  id?: string
  stopId?: string
  docks?: readonly string[]
  onChange: (docks: readonly string[]) => void
}

export const BoardCycleDockPicker = ({
  id,
  stopId,
  docks,
  onChange,
}: BoardCycleDockPickerProps) => {
  const selected = useMemo(
    () => [
      ...new Set((docks ?? []).map((id) => formatBikePointId(id)).filter(Boolean)),
    ],
    [docks]
  )
  const [seedIds, setSeedIds] = useState<string[]>([])
  const [poolIds, setPoolIds] = useState<string[]>([])
  const [binnedIds, setBinnedIds] = useState<Set<string>>(() => new Set())
  const [labels, setLabels] = useState<Record<string, string>>({})
  const [finderOpen, setFinderOpen] = useState(false)
  const [view, setView] = useState<ExplorerView>("list")

  useEffect(() => {
    if (!stopId) {
      setSeedIds([])
      return
    }
    let cancelled = false
    void getBoardNearbyPlacesForStop(stopId).then((result) => {
      if (cancelled || !result.ok) return
      setSeedIds(result.docks.map((dockId) => formatBikePointId(dockId)))
    })
    return () => {
      cancelled = true
    }
  }, [stopId])

  useEffect(() => {
    setPoolIds((current) => {
      const selectedSet = new Set(selected)
      const next: string[] = []
      const seen = new Set<string>()
      for (const dockId of [...current, ...seedIds]) {
        if (
          selectedSet.has(dockId) ||
          binnedIds.has(dockId) ||
          seen.has(dockId)
        ) {
          continue
        }
        seen.add(dockId)
        next.push(dockId)
      }
      if (
        next.length === current.length &&
        next.every((dockId, index) => dockId === current[index])
      ) {
        return current
      }
      return next
    })
  }, [binnedIds, seedIds, selected])

  const missingKey = [...selected, ...poolIds]
    .filter((dockId) => !labels[dockId])
    .toSorted()
    .join(",")

  useEffect(() => {
    if (!missingKey) return
    const needed = missingKey.split(",")
    let cancelled = false
    void getBoardCycleDockLabels(needed).then((result) => {
      if (cancelled || !result.ok) return
      setLabels((current) => ({ ...current, ...result.labels }))
    })
    return () => {
      cancelled = true
    }
  }, [missingKey])

  const items = useMemo(
    () =>
      [...new Set([...selected, ...poolIds])].map((dockId) => ({
        id: dockId,
        label: labels[dockId] ?? dockLabelFallback(dockId),
      })),
    [labels, poolIds, selected]
  )

  const handleAddPoint = (point: ExplorerPoint) => {
    const dockId = formatBikePointId(point.id)
    if (!dockId) return
    setLabels((current) => ({ ...current, [dockId]: point.name }))
    setBinnedIds((current) => {
      if (!current.has(dockId)) return current
      const next = new Set(current)
      next.delete(dockId)
      return next
    })
    if (selected.includes(dockId)) return
    setPoolIds((current) => current.filter((item) => item !== dockId))
    onChange([...selected, dockId])
  }

  return (
    <>
      <BoardChipListEditor
        id={id}
        label="Cycle docks"
        selectedIds={selected}
        poolIds={poolIds}
        items={items}
        onChange={(next) => {
          const before = new Set([...selected, ...poolIds])
          const after = new Set([...next.selected, ...next.pool])
          setBinnedIds((current) => {
            let changed = false
            const nextBinned = new Set(current)
            for (const dockId of before) {
              if (!after.has(dockId) && !nextBinned.has(dockId)) {
                nextBinned.add(dockId)
                changed = true
              }
            }
            return changed ? nextBinned : current
          })
          onChange(next.selected)
          setPoolIds([...next.pool])
        }}
        poolAction={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7"
            onClick={() => setFinderOpen(true)}
          >
            <CirclePlus className="size-3.5" aria-hidden />
            Add more
          </Button>
        }
      />
      <Dialog open={finderOpen} onOpenChange={setFinderOpen}>
        <DialogContent className="flex h-[min(36rem,85dvh)] w-full max-w-[calc(100%-2rem)] flex-col gap-3 overflow-hidden sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Add cycle docks</DialogTitle>
            <DialogDescription>
              Search by name, or locate docks nearby. Click a dock to add it
              to the board.
            </DialogDescription>
          </DialogHeader>
          {selected.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {selected.map((dockId) => (
                <span
                  key={dockId}
                  className="inline-flex max-w-full items-center gap-1 rounded-md border border-input bg-background px-2 py-0.5 text-xs"
                >
                  <span className="truncate">
                    {labels[dockId] ?? dockLabelFallback(dockId)}
                  </span>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Nothing on the board yet. Click a dock to add it.
            </p>
          )}
          {finderOpen ? (
            <div className="@container/explorer min-h-0 flex-1">
              <CyclePointFinder
                selectedId={selected.at(-1) ?? null}
                onSelect={handleAddPoint}
                view={view}
                onViewChange={setView}
                autoSelectFirst={false}
                addedIds={selected}
                addable
                emptyMessage="No matching docks."
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
