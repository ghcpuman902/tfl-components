"use client"

import { type KeyboardEvent } from "react"
import { createPortal } from "react-dom"
import { LineBadge, LineBadgeGroup } from "@/components/tfl/brand/line-badge"
import {
  ChipAddBadge,
  ChipRemoveBadge,
  EmptySlotChip,
  InsertCaret,
  PoolHint,
} from "@/components/board/chip-drag-ui"
import { useChipDragSort } from "@/hooks/use-chip-drag-sort"
import {
  chipUnitKey,
  expandChipUnits,
  groupServingLinesIntoChipUnits,
  type BoardLineChipUnit,
  type BoardStationLineGroup,
} from "@/lib/tfl/board-station-lines"
import type { RailArrivalsLine } from "@/lib/tfl/arrivals-prepare"
import { getLineNameTiers } from "@/lib/tfl/line-names"
import { cn } from "@/lib/utils"

const insertId = (
  list: readonly string[],
  id: string,
  index?: number
): string[] => {
  const next = list.filter((item) => item !== id)
  const at =
    index === undefined ? next.length : Math.max(0, Math.min(index, next.length))
  next.splice(at, 0, id)
  return next
}

const LineChipFace = ({
  lineId,
  lineName,
}: {
  lineId: string
  lineName?: string
}) => (
  <LineBadge
    lineId={lineId}
    name={lineName}
    className="pointer-events-none"
  />
)

const GroupChipFace = ({ unit }: { unit: Extract<BoardLineChipUnit, { kind: "group" }> }) => (
  <LineBadgeGroup
    lineIds={unit.lineIds}
    className="pointer-events-none h-5 min-w-16 max-w-48"
  />
)

const DragLineChip = ({
  label,
  placement,
  dragging,
  removable,
  chipRef,
  onPointerDown,
  onKeyDown,
  children,
}: {
  label: string
  placement: "slot" | "pool" | "ghost"
  dragging?: boolean
  removable?: boolean
  chipRef?: (node: HTMLButtonElement | null) => void
  onPointerDown?: (event: React.PointerEvent<HTMLButtonElement>) => void
  onKeyDown?: (event: KeyboardEvent<HTMLButtonElement>) => void
  children: React.ReactNode
}) => (
  <button
    ref={chipRef}
    type="button"
    aria-label={label}
    aria-grabbed={dragging || undefined}
    onPointerDown={onPointerDown}
    onKeyDown={onKeyDown}
    className={cn(
      "group relative inline-flex touch-none items-center rounded-sm select-none",
      "cursor-grab outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing",
      placement === "pool" && "opacity-70",
      dragging && "opacity-30"
    )}
  >
    {children}
    {placement === "pool" ? <ChipAddBadge /> : null}
    {removable ? <ChipRemoveBadge /> : null}
  </button>
)

type ServingEditorProps = {
  servingLines: readonly RailArrivalsLine[]
  lineGroups: readonly BoardStationLineGroup[] | undefined
  selected: readonly string[]
  onChange: (next: readonly string[]) => void
}

export const BoardServingLineEditor = ({
  servingLines,
  lineGroups,
  selected,
  onChange,
}: ServingEditorProps) => {
  const units = groupServingLinesIntoChipUnits(
    selected.length > 0
      ? selected.flatMap((id) => {
          const line = servingLines.find((row) => row.lineId === id)
          return line ? [line] : []
        })
      : servingLines,
    lineGroups
  )
  const byKey = new Map(units.map((unit) => [chipUnitKey(unit), unit]))
  const keys = units.map((unit) => chipUnitKey(unit))

  const reorderUnits = (id: string, index?: number) => {
    const nextKeys = insertId(keys, id, index)
    const nextUnits = nextKeys.flatMap((key) => {
      const unit = byKey.get(key)
      return unit ? [unit] : []
    })
    onChange(expandChipUnits(nextUnits))
  }

  const drag = useChipDragSort<string, "selected">({
    zones: ["selected"],
    itemsInZone: () => keys,
    onDrop: (id, _zone, index) => reorderUnits(id, index),
  })

  if (units.length === 0) return null

  const visible = keys.filter((key) => key !== drag.activeId)
  const showCaret = drag.overZone === "selected" && drag.insertIndex !== null
  const ghostUnit = drag.ghost ? byKey.get(drag.ghost.id) : undefined

  return (
    <div
      ref={drag.zoneRef("selected")}
      role="list"
      aria-label="Lines at this stop"
      className={cn(
        "flex min-h-8 flex-wrap items-center gap-1.5 rounded-lg py-0.5",
        drag.overZone === "selected" && "bg-muted/40"
      )}
    >
      {visible.map((key, index) => {
        const unit = byKey.get(key)
        if (!unit) return null
        const label =
          unit.kind === "line"
            ? (servingLines.find((line) => line.lineId === unit.lineId)
                ?.lineName ?? getLineNameTiers(unit.lineId).full)
            : unit.label
        return (
          <span key={key} className="inline-flex items-center gap-1.5">
            {showCaret && drag.insertIndex === index ? <InsertCaret /> : null}
            <DragLineChip
              label={label}
              placement="slot"
              dragging={drag.activeId === key}
              chipRef={drag.chipRef(key)}
              onPointerDown={(event) =>
                drag.handlePointerDown(event, key, "selected")
              }
            >
              {unit.kind === "line" ? (
                <LineChipFace lineId={unit.lineId} lineName={label} />
              ) : (
                <GroupChipFace unit={unit} />
              )}
            </DragLineChip>
          </span>
        )
      })}
      {showCaret && drag.insertIndex === visible.length ? <InsertCaret /> : null}
      {ghostUnit && drag.ghost
        ? createPortal(
            <div
              aria-hidden
              className="pointer-events-none fixed z-50 opacity-95 shadow-sm"
              style={{
                left: drag.ghost.x - drag.ghost.offsetX,
                top: drag.ghost.y - drag.ghost.offsetY,
                width: drag.ghost.width,
              }}
            >
              <DragLineChip label="" placement="ghost">
                {ghostUnit.kind === "line" ? (
                  <LineChipFace lineId={ghostUnit.lineId} />
                ) : (
                  <GroupChipFace unit={ghostUnit} />
                )}
              </DragLineChip>
            </div>,
            document.body
          )
        : null}
    </div>
  )
}

type ExtraEditorProps = {
  lines: readonly { lineId: string; lineName?: string }[]
  selected: readonly string[]
  onChange: (next: readonly string[]) => void
}

export const BoardExtraStatusLineEditor = ({
  lines,
  selected,
  onChange,
}: ExtraEditorProps) => {
  const byId = new Map(lines.map((line) => [line.lineId, line]))
  const selectedIds = selected.filter((id) => byId.has(id))
  const poolIds = lines
    .map((line) => line.lineId)
    .filter((id) => !selectedIds.includes(id))

  const move = (id: string, to: "selected" | "pool", index?: number) => {
    if (to === "pool") {
      onChange(selectedIds.filter((item) => item !== id))
      return
    }
    onChange(insertId(selectedIds, id, index))
  }

  const drag = useChipDragSort<string, "selected" | "pool">({
    zones: ["selected", "pool"],
    itemsInZone: (zone) => (zone === "selected" ? selectedIds : poolIds),
    onDrop: (id, zone, index) => move(id, zone, index),
    onClick: (id, from) => move(id, from === "pool" ? "selected" : "pool"),
  })

  const handleKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    id: string,
    from: "selected" | "pool"
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      move(id, from === "pool" ? "selected" : "pool")
      return
    }
    if (
      from === "selected" &&
      (event.key === "Backspace" || event.key === "Delete")
    ) {
      event.preventDefault()
      move(id, "pool")
    }
  }

  const renderChip = (id: string, from: "selected" | "pool") => {
    const line = byId.get(id)
    if (!line) return null
    const label = line.lineName ?? getLineNameTiers(id).full
    return (
      <DragLineChip
        key={id}
        label={
          from === "pool" ? `Add ${label}` : `Remove ${label} from priority`
        }
        placement={from === "pool" ? "pool" : "slot"}
        removable={from === "selected"}
        dragging={drag.activeId === id}
        chipRef={drag.chipRef(id)}
        onPointerDown={(event) => drag.handlePointerDown(event, id, from)}
        onKeyDown={(event) => handleKeyDown(event, id, from)}
      >
        <LineChipFace lineId={id} lineName={label} />
      </DragLineChip>
    )
  }

  const visibleSelected = selectedIds.filter((id) => id !== drag.activeId)
  const showCaret = drag.overZone === "selected" && drag.insertIndex !== null
  const ghostLine = drag.ghost ? byId.get(drag.ghost.id) : undefined

  return (
    <div role="group" aria-label="Additional status lines" className="space-y-2">
      <div
        ref={drag.zoneRef("selected")}
        className={cn(
          "flex min-h-10 flex-wrap content-start items-start gap-1.5 rounded-xl border border-input bg-muted/20 p-2.5",
          drag.overZone === "selected" && "bg-muted/45"
        )}
      >
        {visibleSelected.length === 0 && !showCaret ? <EmptySlotChip /> : null}
        {visibleSelected.map((id, index) => (
          <span key={id} className="inline-flex items-center gap-1.5">
            {showCaret && drag.insertIndex === index ? <InsertCaret /> : null}
            {renderChip(id, "selected")}
          </span>
        ))}
        {showCaret && drag.insertIndex === visibleSelected.length ? (
          <InsertCaret />
        ) : null}
      </div>
      <div
        ref={drag.zoneRef("pool")}
        className={cn(
          "flex min-h-8 flex-wrap items-center gap-1.5 rounded-lg px-0.5 py-0.5",
          drag.overZone === "pool" && "bg-muted/40"
        )}
      >
        {poolIds.map((id) => renderChip(id, "pool"))}
        <PoolHint
          poolCount={poolIds.length}
          selectedCount={selectedIds.length}
        />
      </div>
      {ghostLine && drag.ghost
        ? createPortal(
            <div
              aria-hidden
              className="pointer-events-none fixed z-50 opacity-95 shadow-sm"
              style={{
                left: drag.ghost.x - drag.ghost.offsetX,
                top: drag.ghost.y - drag.ghost.offsetY,
                width: drag.ghost.width,
              }}
            >
              <DragLineChip label="" placement="ghost">
                <LineChipFace
                  lineId={ghostLine.lineId}
                  lineName={ghostLine.lineName}
                />
              </DragLineChip>
            </div>,
            document.body
          )
        : null}
    </div>
  )
}
