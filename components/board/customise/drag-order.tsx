"use client"

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react"
import { GripVerticalIcon, MenuIcon } from "lucide-react"
import { useReorderVariant } from "@/components/board/customise/use-reorder-variant"
import { clampDrag, shiftFor, targetIndexFor } from "@/lib/drag-order-geometry"
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
  /** Resting layout, measured when the row lifts (variants A and B). */
  lifted?: { offsets: number[]; heights: number[]; from: number }
  target?: number
}

/** The lifted row in variants A and B, for rendering. */
type Lift = {
  id: string
  from: number
  target: number
  dy: number
  height: number
}

const PRESSING =
  "bg-muted scale-[0.98] transition-[scale,background-color] duration-350 ease-out motion-reduce:transition-none"
const LIFTED =
  "relative z-10 scale-[1.04] rounded-xl border-transparent bg-background shadow-lg transition-[scale,box-shadow,border-radius] duration-150 ease-out motion-reduce:transition-none"
const SLIDING =
  "transition-transform duration-150 ease-out motion-reduce:transition-none"

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
 *
 * `?reorder=a|b` instead lifts the row to follow the pointer while the others
 * slide aside: spread `rowMotion(id)` on each row. A shows a press cue during
 * the hold; B only drags from `<ReorderHandle />` while `editing`.
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
  const variant = useReorderVariant()
  const follows = variant !== "default"
  const [lift, setLift] = useState<Lift | null>(null)
  const [pressing, setPressing] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const orderable = ids.length > 1

  // Registered up front: Chrome only lets a touchmove listener cancel
  // scrolling if it was there when the touch started.
  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const holdPage = (event: TouchEvent) => {
      if (drag.current && pressHoldsPage(drag.current.press))
        event.preventDefault()
    }
    list.addEventListener("touchmove", holdPage, { passive: false })
    return () => list.removeEventListener("touchmove", holdPage)
  }, [])

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

    const liftRow = () => {
      if (session.lifted) return
      const from = ids.indexOf(session.id)
      const nodes = ids.map((item) => rowRefs.current.get(item))
      // Layout boxes, not client rects: the press cue scales the row.
      const offsets = nodes.map((node) => node?.offsetTop ?? 0)
      const heights = nodes.map((node) => node?.offsetHeight ?? 0)
      session.lifted = { offsets, heights, from }
      session.target = from
      setPressing(null)
      setLift({
        id: session.id,
        from,
        target: from,
        dy: 0,
        height: heights[from] ?? 0,
      })
    }
    const follow = (y: number) => {
      const lifted = session.lifted
      if (!lifted) return
      const { offsets, heights, from } = lifted
      const dy = clampDrag(offsets, heights, from, y - session.startY)
      const target = targetIndexFor(offsets, heights, from, dy)
      session.target = target
      setLift({ id: session.id, from, target, dy, height: heights[from] ?? 0 })
    }

    const finish = (dropY: number | null) => {
      if (drag.current !== session) return
      window.clearTimeout(session.timer)
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
      window.removeEventListener("pointercancel", up)
      window.removeEventListener("contextmenu", holdMenu)
      drag.current = null
      if (session.touch && pressHoldsPage(session.press)) {
        swallowClick.current = true
      }
      setDragging(null)
      setMarker(null)
      if (follows) {
        // Same commit as the reorder below: the row lands with no jump.
        setLift(null)
        setPressing(null)
      }
      if (dropY === null) return
      if (session.lifted) {
        const { target = session.lifted.from } = session
        if (target !== session.lifted.from) onPlace(session.id, target)
        return
      }
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
      if (follows) {
        if (session.press === "dragging") liftRow()
        return follow(moveEvent.clientY)
      }
      if (session.press !== "dragging") return
      if (was !== "dragging") setDragging(session.id)
      setMarker(dropAt(session.id, moveEvent.clientY))
    }
    const up = (upEvent: PointerEvent) => {
      if (upEvent.pointerId !== session.pointerId) return
      finish(
        upEvent.type === "pointerup" &&
          (session.press === "dragging" || session.lifted !== undefined)
          ? upEvent.clientY
          : null
      )
    }
    // Android opens a context menu on a long press.
    const holdMenu = (menuEvent: Event) => {
      if (pressHoldsPage(session.press)) menuEvent.preventDefault()
    }

    if (press === "pending") {
      session.timer = window.setTimeout(() => {
        session.press = nextPress(session.press, { kind: "timer" })
        if (drag.current !== session || session.press !== "armed") return
        if (follows) liftRow()
        else setDragging(session.id)
        navigator.vibrate?.(10)
      }, LONG_PRESS_MS)
    }
    // B's handle: a finger lifts the row at once; a mouse once it moves.
    if (follows && press === "armed" && session.touch) liftRow()
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
    window.addEventListener("pointercancel", up)
    window.addEventListener("contextmenu", holdMenu)
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

  const rowMotion = (
    id: string
  ): { className?: string; style?: CSSProperties } => {
    if (!follows) return {}
    if (lift?.id === id)
      return {
        className: LIFTED,
        style: { transform: `translateY(${lift.dy}px)` },
      }
    if (lift) {
      const shift = shiftFor(
        ids.indexOf(id),
        lift.from,
        lift.target,
        lift.height
      )
      return {
        className: SLIDING,
        style: shift ? { transform: `translateY(${shift}px)` } : undefined,
      }
    }
    return pressing === id ? { className: PRESSING } : {}
  }

  return {
    listRef,
    dragging,
    marker,
    variant,
    /** B: Reorder mode, where handles drag. */
    editing: variant === "b" && orderable && editing,
    setEditing,
    rowMotion,
    row: (id: string) => (node: HTMLElement | null) => {
      if (node) rowRefs.current.set(id, node)
      else rowRefs.current.delete(id)
    },
    press: (id: string) => ({
      onPointerDown: (event: ReactPointerEvent<HTMLElement>) => {
        swallowClick.current = false
        if (!orderable || event.pointerType !== "touch" || drag.current) return
        // B never drags a row by touch outside its handle.
        if (variant === "b") return
        begin(id, event, "pending")
        if (variant === "a") setPressing(id)
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

/** B: Reorder / Done, at the right of a list heading. Hit area runs past it. */
export const ReorderToggle = ({
  editing,
  onToggle,
}: {
  editing: boolean
  onToggle: () => void
}) => (
  <button
    type="button"
    aria-pressed={editing}
    className="relative text-sm font-medium text-foreground outline-none after:absolute after:-inset-x-2 after:-inset-y-3 focus-visible:ring-3 focus-visible:ring-ring/50"
    onClick={onToggle}
  >
    {editing ? "Done" : "Reorder"}
  </button>
)

/** B: the ≡ grip at the right of a row in Reorder mode; drags at once. */
export const ReorderHandle = ({
  name,
  onPointerDown,
  onKeyDown,
}: {
  name: string
  onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void
}) => (
  <button
    type="button"
    data-drag-grip
    aria-label={`Drag ${name} to reorder (or use arrow keys)`}
    className="inline-flex size-11 shrink-0 cursor-grab touch-none items-center justify-center text-muted-foreground outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing"
    onPointerDown={onPointerDown}
    onKeyDown={onKeyDown}
  >
    <MenuIcon className="size-5" aria-hidden />
  </button>
)

export const DropMarker = ({ top }: { top: number }) => (
  <li
    aria-hidden
    className="pointer-events-none absolute inset-x-0 h-0.5 -translate-y-1/2 bg-foreground"
    style={{ top }}
  />
)
