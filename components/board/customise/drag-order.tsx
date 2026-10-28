"use client"

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react"
import { GripVerticalIcon } from "lucide-react"
import {
  LONG_PRESS_MS,
  nextPress,
  pressHoldsPage,
  type Press,
} from "@/lib/drag-press"
import { cn } from "@/lib/utils"

type Drag = {
  id: string
  pointerId: number
  startX: number
  startY: number
  press: Press
  touch: boolean
  timer?: number
}

/**
 * The grip's column. Its dots sit as far from the left edge as the ⋯ / ✕
 * glyphs sit from the right. Touch has no grip, just a matching inset.
 */
export const GRIP_SLOT =
  "relative flex w-9 shrink-0 self-stretch pointer-coarse:w-3"

/** Where a finger long-presses: no text selection or callout on the hold. */
export const PRESS_SURFACE =
  "pointer-coarse:select-none pointer-coarse:[-webkit-touch-callout:none]"

/**
 * Vertical drag-to-reorder for a list: `<DragGrip {...grip(id)} />` in each
 * row, `ref={row(id)}` on each row, `{...press(id)}` on the part of the row a
 * finger long-presses, and `listRef` on the `relative` list that holds
 * `<DropMarker />`. Mouse drags the grip; touch holds a row, then drags (a
 * quick swipe still scrolls); arrow keys on the grip move one place.
 */
export const useDragOrder = <T extends HTMLElement>({
  ids,
  onPlace,
}: {
  ids: readonly string[]
  onPlace: (id: string, index: number) => void
}) => {
  const listRef = useRef<T | null>(null)
  const rowRefs = useRef(new Map<string, HTMLElement>())
  const drag = useRef<Drag | null>(null)
  const swallowClick = useRef(false)
  const refocus = useRef<string | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const [marker, setMarker] = useState<{ index: number; top: number } | null>(
    null
  )
  const orderable = ids.length > 1

  useEffect(() => {
    const id = refocus.current
    if (!id) return
    refocus.current = null
    rowRefs.current
      .get(id)
      ?.querySelector<HTMLElement>("[data-drag-grip]")
      ?.focus()
  })

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

  const begin = (
    id: string,
    event: ReactPointerEvent<HTMLElement>,
    press: Press
  ) => {
    const session: Drag = {
      id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      press,
      touch: event.pointerType === "touch",
    }
    drag.current = session

    const finish = (dropY: number | null) => {
      if (drag.current !== session) return
      window.clearTimeout(session.timer)
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
      window.removeEventListener("pointercancel", up)
      window.removeEventListener("touchmove", holdPage)
      window.removeEventListener("contextmenu", holdPage)
      drag.current = null
      if (session.touch && pressHoldsPage(session.press)) {
        swallowClick.current = true
      }
      setDragging(null)
      setMarker(null)
      if (dropY === null) return
      const drop = dropAt(session.id, dropY)
      if (drop && drop.index !== ids.indexOf(session.id))
        onPlace(session.id, drop.index)
    }
    const move = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== session.pointerId) return
      const was = session.press
      session.press = nextPress(was, {
        kind: "move",
        dx: moveEvent.clientX - session.startX,
        dy: moveEvent.clientY - session.startY,
      })
      if (session.press === "released") return finish(null)
      if (session.press !== "dragging") return
      if (was !== "dragging") setDragging(session.id)
      setMarker(dropAt(session.id, moveEvent.clientY))
    }
    const up = (upEvent: PointerEvent) => {
      if (upEvent.pointerId !== session.pointerId) return
      finish(
        upEvent.type === "pointerup" && session.press === "dragging"
          ? upEvent.clientY
          : null
      )
    }
    // Only an armed press holds the page: until then a swipe scrolls.
    const holdPage = (holdEvent: Event) => {
      if (pressHoldsPage(session.press)) holdEvent.preventDefault()
    }

    if (press === "pending") {
      session.timer = window.setTimeout(() => {
        session.press = nextPress(session.press, { kind: "timer" })
        if (drag.current !== session || session.press !== "armed") return
        setDragging(session.id)
        navigator.vibrate?.(10)
      }, LONG_PRESS_MS)
    }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
    window.addEventListener("pointercancel", up)
    window.addEventListener("touchmove", holdPage, { passive: false })
    window.addEventListener("contextmenu", holdPage)
  }

  const handleKey = (event: KeyboardEvent<HTMLButtonElement>, id: string) => {
    const at = ids.indexOf(id)
    const to =
      event.key === "ArrowUp" ? at - 1 : event.key === "ArrowDown" ? at + 1 : -1
    if (to < 0 || to >= ids.length) return
    event.preventDefault()
    // React may move this row's node, which drops focus; put it back.
    refocus.current = id
    onPlace(id, to)
  }

  return {
    listRef,
    dragging,
    marker,
    row: (id: string) => (node: HTMLElement | null) => {
      if (node) rowRefs.current.set(id, node)
      else rowRefs.current.delete(id)
    },
    press: (id: string) => ({
      onPointerDown: (event: ReactPointerEvent<HTMLElement>) => {
        swallowClick.current = false
        if (!orderable || event.pointerType !== "touch" || drag.current) return
        begin(id, event, "pending")
      },
      // A long press that armed is not also a tap on what it started on.
      onClickCapture: (event: ReactMouseEvent<HTMLElement>) => {
        if (!swallowClick.current) return
        swallowClick.current = false
        event.preventDefault()
        event.stopPropagation()
      },
    }),
    grip: (id: string) => ({
      alone: !orderable,
      onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => {
        if (event.button !== 0 || drag.current) return
        event.currentTarget.setPointerCapture(event.pointerId)
        begin(id, event, "armed")
      },
      onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) =>
        handleKey(event, id),
    }),
  }
}

/**
 * Mouse and keyboard handle; a lone item keeps the column but has no grip.
 * On touch it is invisible and lets presses through to the row, but still
 * takes keyboard focus (and shows while focused).
 */
export const DragGrip = ({
  name,
  alone,
  onPointerDown,
  onKeyDown,
}: {
  name: string
  alone: boolean
  onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void
}) => (
  <span className={GRIP_SLOT}>
    {alone ? null : (
      <button
        type="button"
        data-drag-grip
        aria-label={`Drag ${name} to reorder (or use arrow keys)`}
        className={cn(
          "relative inline-flex w-full items-center justify-center text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          "cursor-grab touch-none select-none active:cursor-grabbing",
          // 36 px wide, 44 px to tap: the target runs on under the next part.
          "after:absolute after:inset-y-0 after:right-[-0.5rem] after:left-0",
          "pointer-coarse:pointer-events-none pointer-coarse:absolute pointer-coarse:inset-y-0 pointer-coarse:left-0 pointer-coarse:z-10 pointer-coarse:w-9 pointer-coarse:bg-background pointer-coarse:opacity-0 pointer-coarse:focus-visible:opacity-100"
        )}
        onPointerDown={onPointerDown}
        onKeyDown={onKeyDown}
      >
        <GripVerticalIcon
          className="size-5 text-muted-foreground"
          aria-hidden
        />
      </button>
    )}
  </span>
)

export const DropMarker = ({ top }: { top: number }) => (
  <li
    aria-hidden
    className="pointer-events-none absolute inset-x-0 h-0.5 -translate-y-1/2 bg-foreground"
    style={{ top }}
  />
)
