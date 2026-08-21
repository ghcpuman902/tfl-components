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
import { getBoardCycleDockLabels } from "@/lib/tfl/board-place-search-action"
import type { ExplorerPoint } from "@/lib/tfl/explorer-point-normalise"
import type { ExplorerView } from "@/lib/tfl/explorer-url-state"

const dockLabelFallback = (id: string): string =>
  id.startsWith("BikePoints_") ? id.slice("BikePoints_".length) : id

type BoardCycleDockPickerProps = {
  id?: string
  docks?: readonly string[]
  onChange: (docks: readonly string[]) => void
}

export const BoardCycleDockPicker = ({
  id,
  docks,
  onChange,
}: BoardCycleDockPickerProps) => {
  const selected = useMemo(
    () => [
      ...new Set((docks ?? []).map((id) => formatBikePointId(id)).filter(Boolean)),
    ],
    [docks]
  )
  const [poolIds, setPoolIds] = useState<string[]>([])
  const [labels, setLabels] = useState<Record<string, string>>({})
  const [finderOpen, setFinderOpen] = useState(false)
  const [view, setView] = useState<ExplorerView>("list")

  useEffect(() => {
    const selectedSet = new Set(selected)
    setPoolIds((current) => current.filter((id) => !selectedSet.has(id)))
  }, [selected])

  const missingKey = [...selected, ...poolIds]
    .filter((id) => !labels[id])
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
      [...new Set([...selected, ...poolIds])].map((id) => ({
        id,
        label: labels[id] ?? dockLabelFallback(id),
      })),
    [labels, poolIds, selected]
  )

  const handleAddPoint = (point: ExplorerPoint) => {
    const id = formatBikePointId(point.id)
    if (!id) return
    setLabels((current) => ({ ...current, [id]: point.name }))
    if (selected.includes(id)) return
    setPoolIds((current) => current.filter((item) => item !== id))
    onChange([...selected, id])
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
              Search by name, or locate docks nearby.
            </DialogDescription>
          </DialogHeader>
          {finderOpen ? (
            <div className="@container/explorer min-h-0 flex-1">
              <CyclePointFinder
                selectedId={selected.at(-1) ?? null}
                onSelect={handleAddPoint}
                view={view}
                onViewChange={setView}
                autoSelectFirst={false}
                emptyMessage="No matching docks."
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
