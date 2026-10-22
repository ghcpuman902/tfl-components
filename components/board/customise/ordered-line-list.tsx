"use client"

import {
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react"
import { ArrowUpToLineIcon, GripVerticalIcon, XIcon } from "lucide-react"
import { ICON_BUTTON, lineName } from "@/components/board/customise/parts"
import { LineBadge } from "@/components/tfl/brand/line-badge"
import { cn } from "@/lib/utils"

const DRAG_THRESHOLD_PX = 6

type Drag = { id: string; pointerId: number; startY: number; active: boolean }

/**
 * Vertical priority list. Drag the grip (mouse, pen or touch: the grip is
 * `touch-none`, so a finger drags instead of scrolling), or use ⤒ to move a
 * line to the top, or arrow keys on the grip. ✕ takes a line out.
 */
export const OrderedLineList = ({
  label,
  ids,
  onPlace,
  onTop,
  onRemove,
}: {
  label: string
  ids: readonly string[]
  onPlace: (lineId: string, index: number) => void
  onTop: (lineId: string) => void
  onRemove?: (lineId: string) => void
}) => {
  const listRef = useRef<HTMLOListElement | null>(null)
  const rowRefs = useRef(new Map<string, HTMLLIElement>())
  const drag = useRef<Drag | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const [marker, setMarker] = useState<{ index: number; top: number } | null>(
    null
  )

  const dropAt = (id: string, y: number) => {
    const list = listRef.current
    if (!list) return null
    const others = ids.filter((item) => item !== id)
    const rects = others.map((item) =>
      rowRefs.current.get(item)?.getBoundingClientRect()
    )
    let index = 0
    for (const rect of rects) {
      if (rect && rect.top + rect.height / 2 < y) index += 1
    }
    const listTop = list.getBoundingClientRect().top
    const at = rects[index]
    const before = rects[index - 1]
    const top = at ? at.top - listTop : before ? before.bottom - listTop : 0
    return { index, top }
  }

  const handlePointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>,
    id: string
  ) => {
    if (event.button !== 0) return
    const target = event.currentTarget
    target.setPointerCapture(event.pointerId)
    drag.current = {
      id,
      pointerId: event.pointerId,
      startY: event.clientY,
      active: false,
    }

    const move = (moveEvent: PointerEvent) => {
      const session = drag.current
      if (!session || moveEvent.pointerId !== session.pointerId) return
      if (
        !session.active &&
        Math.abs(moveEvent.clientY - session.startY) >= DRAG_THRESHOLD_PX
      ) {
        session.active = true
        setDragging(session.id)
      }
      if (session.active) setMarker(dropAt(session.id, moveEvent.clientY))
    }
    const up = (upEvent: PointerEvent) => {
      const session = drag.current
      if (!session || upEvent.pointerId !== session.pointerId) return
      if (target.hasPointerCapture(upEvent.pointerId))
        target.releasePointerCapture(upEvent.pointerId)
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
      window.removeEventListener("pointercancel", up)
      drag.current = null
      setDragging(null)
      setMarker(null)
      if (!session.active || upEvent.type === "pointercancel") return
      const drop = dropAt(session.id, upEvent.clientY)
      if (drop && drop.index !== ids.indexOf(session.id))
        onPlace(session.id, drop.index)
    }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
    window.addEventListener("pointercancel", up)
  }

  const handleKey = (event: KeyboardEvent<HTMLButtonElement>, id: string) => {
    const at = ids.indexOf(id)
    if (event.key === "ArrowUp" && at > 0) {
      event.preventDefault()
      onPlace(id, at - 1)
    } else if (event.key === "ArrowDown" && at < ids.length - 1) {
      event.preventDefault()
      onPlace(id, at + 1)
    }
  }

  return (
    <ol
      ref={listRef}
      role="list"
      aria-label={label}
      className="relative border-y border-border"
    >
      {ids.map((id, index) => {
        const name = lineName(id)
        return (
          <li
            key={id}
            ref={(node) => {
              if (node) rowRefs.current.set(id, node)
              else rowRefs.current.delete(id)
            }}
            className={cn(
              "flex min-h-11 items-center gap-1 border-b border-border last:border-b-0",
              dragging === id && "opacity-40"
            )}
          >
            <button
              type="button"
              aria-label={`Drag ${name} to reorder (or use arrow keys)`}
              className={cn(
                ICON_BUTTON,
                "cursor-grab touch-none select-none active:cursor-grabbing"
              )}
              onPointerDown={(event) => handlePointerDown(event, id)}
              onKeyDown={(event) => handleKey(event, id)}
            >
              <GripVerticalIcon
                className="size-5 text-muted-foreground"
                aria-hidden
              />
            </button>
            <span className="w-6 shrink-0 text-right text-sm text-muted-foreground tabular-nums">
              {index + 1}
            </span>
            <span className="min-w-0 flex-1 px-1">
              <LineBadge lineId={id} name={name} />
            </span>
            <button
              type="button"
              aria-label={`Move ${name} to top`}
              disabled={index === 0}
              className={ICON_BUTTON}
              onClick={() => onTop(id)}
            >
              <ArrowUpToLineIcon className="size-5" aria-hidden />
            </button>
            {onRemove ? (
              <button
                type="button"
                aria-label={`Take ${name} out`}
                className={ICON_BUTTON}
                onClick={() => onRemove(id)}
              >
                <XIcon className="size-5" aria-hidden />
              </button>
            ) : null}
          </li>
        )
      })}
      {marker ? (
        <li
          aria-hidden
          className="pointer-events-none absolute inset-x-0 h-0.5 -translate-y-1/2 bg-foreground"
          style={{ top: marker.top }}
        />
      ) : null}
    </ol>
  )
}
