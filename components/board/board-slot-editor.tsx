"use client"

import { useEffect, useRef, type KeyboardEvent } from "react"
import { createPortal } from "react-dom"
import { PlaceholderRoundelSvg } from "@/components/tfl/brand/tfl-roundel"
import {
  ChipAddBadge,
  ChipRemoveBadge,
  EmptySlotChip,
  InsertCaret,
  PoolHint,
} from "@/components/board/chip-drag-ui"
import { useChipDragSort } from "@/hooks/use-chip-drag-sort"
import {
  BOARD_PANEL_KINDS,
  moveBoardPanel,
  resolveBoardSlots,
  type BoardPanelKind,
  type BoardSlotZone,
} from "@/lib/tfl/board-panels"
import type { BoardSlotsConfig } from "@/lib/tfl/board-url-state"
import type { RoundelPreset } from "@/lib/tfl/roundel-presets"
import { cn } from "@/lib/utils"

const PANEL_META: Record<
  BoardPanelKind,
  { label: string; roundel: RoundelPreset }
> = {
  rail: { label: "Rail", roundel: "underground" },
  bus: { label: "Bus", roundel: "buses" },
  river: { label: "River", roundel: "river" },
  cycle: { label: "Cycle", roundel: "cycles" },
  status: { label: "Status", roundel: "tfl" },
}

const SLOT_ZONES = ["p1", "p2", "pool"] as const

const SLOT_LABEL: Record<Exclude<BoardSlotZone, "pool">, string> = {
  p1: "Wide slot",
  p2: "Narrow slot",
}

type BoardSlotEditorProps = {
  slots: BoardSlotsConfig
  onChange: (slots: BoardSlotsConfig) => void
}

const PanelChip = ({
  kind,
  placement,
  dragging,
  chipRef,
  onPointerDown,
  onKeyDown,
}: {
  kind: BoardPanelKind
  placement: "slot" | "pool" | "ghost"
  dragging?: boolean
  chipRef?: (node: HTMLButtonElement | null) => void
  onPointerDown?: (event: React.PointerEvent<HTMLButtonElement>) => void
  onKeyDown?: (event: KeyboardEvent<HTMLButtonElement>) => void
}) => {
  const meta = PANEL_META[kind]
  const inSlot = placement === "slot"
  return (
    <button
      ref={chipRef}
      type="button"
      aria-label={inSlot ? `Remove ${meta.label}` : `Add ${meta.label}`}
      aria-grabbed={dragging || undefined}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      className={cn(
        "group relative inline-flex h-7 max-w-full touch-none items-center gap-1.5 rounded-md border px-2 text-left text-sm select-none",
        "cursor-grab outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing",
        placement === "pool"
          ? "border-transparent bg-muted/50 text-muted-foreground hover:bg-muted"
          : "border-input bg-background text-foreground",
        dragging && "opacity-30"
      )}
    >
      <PlaceholderRoundelSvg
        variant={meta.roundel}
        text=""
        className="pointer-events-none size-3.5 shrink-0"
        aria-hidden
      />
      <span className="truncate">{meta.label}</span>
      {placement === "pool" ? <ChipAddBadge /> : null}
      {inSlot ? <ChipRemoveBadge /> : null}
    </button>
  )
}

export const BoardSlotEditor = ({ slots, onChange }: BoardSlotEditorProps) => {
  const resolved = resolveBoardSlots(slots.p1, slots.p2)
  const unused = BOARD_PANEL_KINDS.filter(
    (kind) => !resolved.p1.includes(kind) && !resolved.p2.includes(kind)
  )
  const resolvedRef = useRef(resolved)
  const onChangeRef = useRef(onChange)

  useEffect(() => {
    resolvedRef.current = resolved
    onChangeRef.current = onChange
  })

  const commit = (next: ReturnType<typeof moveBoardPanel>) => {
    onChangeRef.current({ p1: [...next.p1], p2: [...next.p2] })
  }

  const drag = useChipDragSort<BoardPanelKind, BoardSlotZone>({
    zones: SLOT_ZONES,
    itemsInZone: (zone) => {
      if (zone === "p1") return resolved.p1
      if (zone === "p2") return resolved.p2
      return unused
    },
    onDrop: (kind, zone, index) => {
      commit(moveBoardPanel(resolvedRef.current, kind, zone, index))
    },
    onClick: (kind, from) => {
      commit(
        moveBoardPanel(
          resolvedRef.current,
          kind,
          from === "pool" ? "p1" : "pool"
        )
      )
    },
  })

  const handleChipKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    kind: BoardPanelKind,
    from: BoardSlotZone
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      commit(moveBoardPanel(resolved, kind, from === "pool" ? "p1" : "pool"))
      return
    }
    if (from === "p1" && event.key === "ArrowRight") {
      event.preventDefault()
      commit(moveBoardPanel(resolved, kind, "p2"))
      return
    }
    if (from === "p2" && event.key === "ArrowLeft") {
      event.preventDefault()
      commit(moveBoardPanel(resolved, kind, "p1"))
      return
    }
    if (
      from !== "pool" &&
      (event.key === "Backspace" || event.key === "Delete")
    ) {
      event.preventDefault()
      commit(moveBoardPanel(resolved, kind, "pool"))
    }
  }

  const renderChip = (kind: BoardPanelKind, from: BoardSlotZone) => (
    <PanelChip
      key={kind}
      kind={kind}
      placement={from === "pool" ? "pool" : "slot"}
      dragging={drag.activeId === kind}
      chipRef={drag.chipRef(kind)}
      onPointerDown={(event) => drag.handlePointerDown(event, kind, from)}
      onKeyDown={(event) => handleChipKeyDown(event, kind, from)}
    />
  )

  const renderSlot = (zone: "p1" | "p2", stack: readonly BoardPanelKind[]) => {
    const visible = stack.filter((kind) => kind !== drag.activeId)
    const showCaret = drag.overZone === zone && drag.insertIndex !== null
    return (
      <div
        ref={drag.zoneRef(zone)}
        className={cn(
          "flex min-h-22 min-w-0 flex-col gap-2 rounded-xl border border-input bg-muted/20 p-2.5",
          zone === "p1" ? "col-span-2" : "col-span-1",
          drag.overZone === zone && "bg-muted/45"
        )}
      >
        <p className="text-xs text-muted-foreground">{SLOT_LABEL[zone]}</p>
        <div className="flex min-h-0 flex-1 flex-wrap content-start items-start gap-1.5">
          {visible.length === 0 && !showCaret ? <EmptySlotChip /> : null}
          {visible.map((kind, index) => (
            <span key={kind} className="inline-flex items-center gap-1.5">
              {showCaret && drag.insertIndex === index ? <InsertCaret /> : null}
              {renderChip(kind, zone)}
            </span>
          ))}
          {showCaret && drag.insertIndex === visible.length ? (
            <InsertCaret />
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div role="group" aria-label="Board slots" className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        {renderSlot("p1", resolved.p1)}
        {renderSlot("p2", resolved.p2)}
      </div>
      <div
        ref={drag.zoneRef("pool")}
        className={cn(
          "flex min-h-8 flex-wrap items-center gap-1.5 rounded-lg px-0.5 py-0.5",
          drag.overZone === "pool" && "bg-muted/40"
        )}
      >
        {unused.map((kind) => renderChip(kind, "pool"))}
        <PoolHint
          poolCount={unused.length}
          selectedCount={resolved.p1.length + resolved.p2.length}
        />
      </div>
      {drag.ghost
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
              <PanelChip kind={drag.ghost.id} placement="ghost" />
            </div>,
            document.body
          )
        : null}
    </div>
  )
}
