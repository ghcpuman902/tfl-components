"use client"

import {
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react"
import { createPortal } from "react-dom"
import { CirclePlus, XIcon } from "lucide-react"
import { PlaceholderRoundelSvg } from "@/components/tfl/brand/tfl-roundel"
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
const DRAG_THRESHOLD_PX = 6

const SLOT_LABEL: Record<Exclude<BoardSlotZone, "pool">, string> = {
  p1: "Wide slot",
  p2: "Narrow slot",
}

type BoardSlotEditorProps = {
  slots: BoardSlotsConfig
  onChange: (slots: BoardSlotsConfig) => void
}

type DragSession = {
  kind: BoardPanelKind
  from: BoardSlotZone
  pointerId: number
  startX: number
  startY: number
  offsetX: number
  offsetY: number
  width: number
  active: boolean
}

type GhostState = {
  kind: BoardPanelKind
  x: number
  y: number
  width: number
  offsetX: number
  offsetY: number
}

const zoneFromPoint = (
  x: number,
  y: number,
  refs: Record<BoardSlotZone, HTMLElement | null>
): BoardSlotZone | null => {
  for (const zone of SLOT_ZONES) {
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
  onPointerDown?: (event: ReactPointerEvent<HTMLButtonElement>) => void
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
      {placement === "pool" ? (
        <CirclePlus
          className="size-3 shrink-0 text-muted-foreground"
          aria-hidden
        />
      ) : null}
      {inSlot ? (
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

export const BoardSlotEditor = ({ slots, onChange }: BoardSlotEditorProps) => {
  const resolved = resolveBoardSlots(slots.p1, slots.p2)
  const unused = BOARD_PANEL_KINDS.filter(
    (kind) => !resolved.p1.includes(kind) && !resolved.p2.includes(kind)
  )
  const zoneRefs = useRef<Record<BoardSlotZone, HTMLElement | null>>({
    p1: null,
    p2: null,
    pool: null,
  })
  const chipRefs = useRef<Partial<Record<BoardPanelKind, HTMLElement | null>>>(
    {}
  )
  const sessionRef = useRef<DragSession | null>(null)
  const resolvedRef = useRef(resolved)
  const onChangeRef = useRef(onChange)
  resolvedRef.current = resolved
  onChangeRef.current = onChange

  const [activeKind, setActiveKind] = useState<BoardPanelKind | null>(null)
  const [overZone, setOverZone] = useState<BoardSlotZone | null>(null)
  const [insertIndex, setInsertIndex] = useState<number | null>(null)
  const [ghost, setGhost] = useState<GhostState | null>(null)

  const dropFromPoint = (
    x: number,
    y: number,
    dragging: BoardPanelKind
  ): { zone: BoardSlotZone; index?: number } | null => {
    const zone = zoneFromPoint(x, y, zoneRefs.current)
    if (!zone) return null
    if (zone === "pool") return { zone }
    const stack = zone === "p1" ? resolvedRef.current.p1 : resolvedRef.current.p2
    const chipEls = stack
      .filter((item) => item !== dragging)
      .map((item) => chipRefs.current[item] ?? null)
    return { zone, index: insertIndexFromPoint(x, y, chipEls) }
  }

  const commit = (next: ReturnType<typeof moveBoardPanel>) => {
    onChangeRef.current({ p1: [...next.p1], p2: [...next.p2] })
  }

  const handlePointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>,
    kind: BoardPanelKind,
    from: BoardSlotZone
  ) => {
    if (event.button !== 0) return
    const target = event.currentTarget
    const rect = target.getBoundingClientRect()
    target.setPointerCapture(event.pointerId)
    sessionRef.current = {
      kind,
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
        setActiveKind(session.kind)
      }
      if (!session.active) return
      setGhost({
        kind: session.kind,
        x: moveEvent.clientX,
        y: moveEvent.clientY,
        width: session.width,
        offsetX: session.offsetX,
        offsetY: session.offsetY,
      })
      const drop = dropFromPoint(
        moveEvent.clientX,
        moveEvent.clientY,
        session.kind
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
      setActiveKind(null)
      setOverZone(null)
      setInsertIndex(null)
      setGhost(null)

      if (session.active) {
        const drop = dropFromPoint(
          upEvent.clientX,
          upEvent.clientY,
          session.kind
        )
        if (drop) {
          commit(
            moveBoardPanel(
              resolvedRef.current,
              session.kind,
              drop.zone,
              drop.index
            )
          )
        }
        return
      }
      if (session.from === "pool") {
        commit(moveBoardPanel(resolvedRef.current, session.kind, "p1"))
        return
      }
      commit(moveBoardPanel(resolvedRef.current, session.kind, "pool"))
    }

    window.addEventListener("pointermove", handleMove)
    window.addEventListener("pointerup", handleUp)
    window.addEventListener("pointercancel", handleUp)
  }

  const handleChipKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    kind: BoardPanelKind,
    from: BoardSlotZone
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      commit(
        moveBoardPanel(resolved, kind, from === "pool" ? "p1" : "pool")
      )
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
      dragging={activeKind === kind}
      chipRef={(node) => {
        chipRefs.current[kind] = node
      }}
      onPointerDown={(event) => handlePointerDown(event, kind, from)}
      onKeyDown={(event) => handleChipKeyDown(event, kind, from)}
    />
  )

  const renderSlot = (zone: "p1" | "p2", stack: readonly BoardPanelKind[]) => {
    const visible = stack.filter((kind) => kind !== activeKind)
    const showCaret = overZone === zone && insertIndex !== null
    return (
      <div
        ref={(node) => {
          zoneRefs.current[zone] = node
        }}
        className={cn(
          "flex min-h-22 min-w-0 flex-col gap-2 rounded-xl border border-input bg-muted/20 p-2.5",
          zone === "p1" ? "col-span-2" : "col-span-1",
          overZone === zone && "bg-muted/45"
        )}
      >
        <p className="text-xs text-muted-foreground">{SLOT_LABEL[zone]}</p>
        <div className="flex min-h-0 flex-1 flex-wrap content-start items-start gap-1.5">
          {visible.length === 0 && !showCaret ? <EmptySlotChip /> : null}
          {visible.map((kind, index) => (
            <span key={kind} className="inline-flex items-center gap-1.5">
              {showCaret && insertIndex === index ? <InsertCaret /> : null}
              {renderChip(kind, zone)}
            </span>
          ))}
          {showCaret && insertIndex === visible.length ? <InsertCaret /> : null}
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
        ref={(node) => {
          zoneRefs.current.pool = node
        }}
        className={cn(
          "flex min-h-8 flex-wrap items-center gap-1.5 rounded-lg px-0.5 py-0.5",
          overZone === "pool" && "bg-muted/40"
        )}
      >
        {unused.map((kind) => renderChip(kind, "pool"))}
        {unused.length > 0 ? <DragToAddChip /> : null}
      </div>
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
              <PanelChip kind={ghost.kind} placement="ghost" />
            </div>,
            document.body
          )
        : null}
    </div>
  )
}
