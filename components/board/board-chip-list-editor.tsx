"use client"

import {
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react"
import { createPortal } from "react-dom"
import { CirclePlus, XIcon } from "lucide-react"
import {
  moveChipListItem,
  type ChipListZone,
} from "@/lib/tfl/board-chip-list"
import { cn } from "@/lib/utils"

const DRAG_THRESHOLD_PX = 6

export type BoardChipListItem = {
  id: string
  label: string
}

type ChipPlacement = "selected" | "pool" | "ghost"

export type BoardChipListEditorProps = {
  label: string
  selectedIds: readonly string[]
  poolIds: readonly string[]
  items: readonly BoardChipListItem[]
  onChange: (next: {
    selected: readonly string[]
    pool: readonly string[]
  }) => void
  renderChip?: (item: BoardChipListItem, placement: ChipPlacement) => ReactNode
  poolAction?: ReactNode
}

type DragSession = {
  id: string
  from: ChipListZone
  pointerId: number
  startX: number
  startY: number
  offsetX: number
  offsetY: number
  width: number
  active: boolean
}

type GhostState = {
  id: string
  x: number
  y: number
  width: number
  offsetX: number
  offsetY: number
}

const zoneFromPoint = (
  x: number,
  y: number,
  refs: Record<ChipListZone, HTMLElement | null>
): ChipListZone | null => {
  for (const zone of ["selected", "pool"] as const) {
    const el = refs[zone]
    if (!el) continue
    const rect = el.getBoundingClientRect()
    if (
      x >= rect.left &&
      x <= rect.right &&
      y >= rect.top &&
      y <= rect.bottom
    ) {
      return zone
    }
  }
  return null
}

const insertIndexFromPoint = (
  x: number,
  y: number,
  chipEls: readonly (HTMLElement | null)[]
): number => {
  for (let index = 0; index < chipEls.length; index++) {
    const el = chipEls[index]
    if (!el) continue
    const rect = el.getBoundingClientRect()
    if (y >= rect.top && y <= rect.bottom && x < rect.left + rect.width / 2) {
      return index
    }
    if (y < rect.top) return index
  }
  return chipEls.length
}

const InsertCaret = () => (
  <span
    aria-hidden
    className="h-7 w-0.5 shrink-0 rounded-full bg-foreground/30"
  />
)

const EmptySlotChip = () => (
  <span
    aria-hidden
    className="inline-flex h-7 min-w-16 rounded-md border border-dashed border-input/80"
  />
)

const DragToAddChip = () => (
  <span
    aria-hidden
    className="inline-flex h-7 items-center rounded-md border border-dashed border-input px-2 text-xs text-muted-foreground"
  >
    Drag to add
  </span>
)

const DefaultChipPaint = ({
  item,
  placement,
}: {
  item: BoardChipListItem
  placement: ChipPlacement
}) => (
  <>
    <span className="truncate">{item.label}</span>
    {placement === "pool" ? (
      <CirclePlus
        className="size-3 shrink-0 text-muted-foreground"
        aria-hidden
      />
    ) : null}
  </>
)

export const BoardChipListEditor = ({
  label,
  selectedIds,
  poolIds,
  items,
  onChange,
  renderChip,
  poolAction,
}: BoardChipListEditorProps) => {
  const byId = new Map(items.map((item) => [item.id, item]))
  const zoneRefs = useRef<Record<ChipListZone, HTMLElement | null>>({
    selected: null,
    pool: null,
  })
  const chipRefs = useRef<Partial<Record<string, HTMLElement | null>>>({})
  const sessionRef = useRef<DragSession | null>(null)
  const selectedRef = useRef(selectedIds)
  const poolRef = useRef(poolIds)
  const onChangeRef = useRef(onChange)
  selectedRef.current = selectedIds
  poolRef.current = poolIds
  onChangeRef.current = onChange

  const [activeId, setActiveId] = useState<string | null>(null)
  const [overZone, setOverZone] = useState<ChipListZone | null>(null)
  const [insertIndex, setInsertIndex] = useState<number | null>(null)
  const [ghost, setGhost] = useState<GhostState | null>(null)

  const state = () => ({
    selected: selectedRef.current,
    pool: poolRef.current,
  })

  const commit = (id: string, to: ChipListZone, index?: number) => {
    onChangeRef.current(moveChipListItem(state(), id, to, index))
  }

  const dropFromPoint = (
    x: number,
    y: number,
    dragging: string
  ): { zone: ChipListZone; index?: number } | null => {
    const zone = zoneFromPoint(x, y, zoneRefs.current)
    if (!zone) return null
    if (zone === "pool") return { zone }
    const chipEls = selectedRef.current
      .filter((item) => item !== dragging)
      .map((item) => chipRefs.current[item] ?? null)
    return { zone, index: insertIndexFromPoint(x, y, chipEls) }
  }

  const handlePointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>,
    id: string,
    from: ChipListZone
  ) => {
    if (event.button !== 0) return
    const target = event.currentTarget
    const rect = target.getBoundingClientRect()
    target.setPointerCapture(event.pointerId)
    sessionRef.current = {
      id,
      from,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      width: rect.width,
      active: false,
    }

    const handleMove = (moveEvent: PointerEvent) => {
      const session = sessionRef.current
      if (!session || moveEvent.pointerId !== session.pointerId) return
      const dx = moveEvent.clientX - session.startX
      const dy = moveEvent.clientY - session.startY
      if (
        !session.active &&
        dx * dx + dy * dy >= DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX
      ) {
        session.active = true
        setActiveId(session.id)
      }
      if (!session.active) return
      setGhost({
        id: session.id,
        x: moveEvent.clientX,
        y: moveEvent.clientY,
        width: session.width,
        offsetX: session.offsetX,
        offsetY: session.offsetY,
      })
      const drop = dropFromPoint(
        moveEvent.clientX,
        moveEvent.clientY,
        session.id
      )
      setOverZone(drop?.zone ?? null)
      setInsertIndex(drop?.index ?? null)
    }

    const handleUp = (upEvent: PointerEvent) => {
      const session = sessionRef.current
      if (!session || upEvent.pointerId !== session.pointerId) return
      if (target.hasPointerCapture(upEvent.pointerId)) {
        target.releasePointerCapture(upEvent.pointerId)
      }
      window.removeEventListener("pointermove", handleMove)
      window.removeEventListener("pointerup", handleUp)
      window.removeEventListener("pointercancel", handleUp)
      sessionRef.current = null
      setActiveId(null)
      setOverZone(null)
      setInsertIndex(null)
      setGhost(null)

      if (session.active) {
        const drop = dropFromPoint(upEvent.clientX, upEvent.clientY, session.id)
        if (drop) commit(session.id, drop.zone, drop.index)
        return
      }
      commit(session.id, session.from === "pool" ? "selected" : "pool")
    }

    window.addEventListener("pointermove", handleMove)
    window.addEventListener("pointerup", handleUp)
    window.addEventListener("pointercancel", handleUp)
  }

  const handleChipKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    id: string,
    from: ChipListZone
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      commit(id, from === "pool" ? "selected" : "pool")
      return
    }
    if (from === "selected" && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
      event.preventDefault()
      const index = selectedIds.indexOf(id)
      if (index < 0) return
      const target =
        event.key === "ArrowLeft" ? Math.max(0, index - 1) : index + 1
      commit(id, "selected", target)
      return
    }
    if (
      from === "selected" &&
      (event.key === "Backspace" || event.key === "Delete")
    ) {
      event.preventDefault()
      commit(id, "pool")
    }
  }

  const paint = (item: BoardChipListItem, placement: ChipPlacement) =>
    renderChip ? (
      renderChip(item, placement)
    ) : (
      <DefaultChipPaint item={item} placement={placement} />
    )

  const renderChipButton = (id: string, from: ChipListZone) => {
    const item = byId.get(id) ?? { id, label: id }
    const inSelected = from === "selected"
    return (
      <button
        key={id}
        ref={(node) => {
          chipRefs.current[id] = node
        }}
        type="button"
        aria-label={inSelected ? `Remove ${item.label}` : `Add ${item.label}`}
        aria-grabbed={activeId === id || undefined}
        onPointerDown={(event) => handlePointerDown(event, id, from)}
        onKeyDown={(event) => handleChipKeyDown(event, id, from)}
        className={cn(
          "group relative inline-flex h-7 max-w-full touch-none items-center gap-1.5 rounded-md border px-2 text-left text-sm select-none",
          "cursor-grab outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing",
          from === "pool"
            ? "border-transparent bg-muted/50 text-muted-foreground hover:bg-muted"
            : "border-input bg-background text-foreground",
          activeId === id && "opacity-30"
        )}
      >
        {paint(item, from)}
        {inSelected ? (
          <span
            aria-hidden
            className="pointer-events-none absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-background text-muted-foreground opacity-0 ring-1 ring-border transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
          >
            <XIcon className="size-2.5" />
          </span>
        ) : null}
      </button>
    )
  }

  const visibleSelected = selectedIds.filter((id) => id !== activeId)
  const showCaret = overZone === "selected" && insertIndex !== null
  const showPool = poolIds.length > 0 || poolAction != null

  return (
    <div role="group" aria-label={label} className="space-y-2">
      <div
        ref={(node) => {
          zoneRefs.current.selected = node
        }}
        className={cn(
          "flex min-h-22 min-w-0 flex-wrap content-start items-start gap-1.5 rounded-xl border border-input bg-muted/20 p-2.5",
          overZone === "selected" && "bg-muted/45"
        )}
      >
        {visibleSelected.length === 0 && !showCaret ? <EmptySlotChip /> : null}
        {visibleSelected.map((id, index) => (
          <span key={id} className="inline-flex items-center gap-1.5">
            {showCaret && insertIndex === index ? <InsertCaret /> : null}
            {renderChipButton(id, "selected")}
          </span>
        ))}
        {showCaret && insertIndex === visibleSelected.length ? (
          <InsertCaret />
        ) : null}
      </div>
      {showPool ? (
        <div
          ref={(node) => {
            zoneRefs.current.pool = node
          }}
          className={cn(
            "flex min-h-8 flex-wrap items-center gap-1.5 rounded-lg px-0.5 py-0.5",
            overZone === "pool" && "bg-muted/40"
          )}
        >
          {poolIds.map((id) => renderChipButton(id, "pool"))}
          {poolIds.length > 0 ? <DragToAddChip /> : null}
          {poolAction}
        </div>
      ) : null}
      {ghost
        ? createPortal(
            <div
              aria-hidden
              className="pointer-events-none fixed z-50 opacity-95 shadow-sm"
              style={{
                left: ghost.x - ghost.offsetX,
                top: ghost.y - ghost.offsetY,
                width: ghost.width,
              }}
            >
              <div className="inline-flex h-7 max-w-full items-center gap-1.5 rounded-md border border-input bg-background px-2 text-sm">
                {paint(byId.get(ghost.id) ?? { id: ghost.id, label: ghost.id }, "ghost")}
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  )
}
