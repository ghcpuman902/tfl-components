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
import { GripVerticalIcon } from "lucide-react"
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
  /** Resting layout, measured when the row lifts. */
  lifted?: { offsets: number[]; heights: number[]; from: number }
  target?: number
}

/** The lifted row, for rendering. */
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
 * Vertical drag-to-reorder for a list: `<DragGrip {...grip(id)} />`,
 * `ref={row(id)}` and `{...rowMotion(id)}` on each row, `{...press(id)}` on
 * the part of the row a finger long-presses, and `listRef` on the list. The
 * row lifts and follows the pointer while the others slide aside. Mouse drags
 * the grip; touch holds a row (shaded while it builds), then drags, and a
 * quick swipe still scrolls; arrow keys on the grip move one place.
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
  const [lift, setLift] = useState<Lift | null>(null)
  const [pressing, setPressing] = useState<string | null>(null)
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

    const finish = (commit: boolean) => {
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
      // Same commit as the reorder below: the row lands with no jump.
      setLift(null)
      setPressing(null)
      const { lifted, target } = session
      if (commit && lifted && target !== undefined && target !== lifted.from)
        onPlace(session.id, target)
    }
    const move = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== session.pointerId) return
      session.press = nextPress(session.press, {
        kind: "move",
        dx: moveEvent.clientX - session.startX,
        dy: moveEvent.clientY - session.startY,
      })
      if (session.press === "released") return finish(false)
      if (session.press === "dragging") liftRow()
      follow(moveEvent.clientY)
    }
    const up = (upEvent: PointerEvent) => {
      if (upEvent.pointerId !== session.pointerId) return
      finish(upEvent.type === "pointerup")
    }
    // Android opens a context menu on a long press.
    const holdMenu = (menuEvent: Event) => {
      if (pressHoldsPage(session.press)) menuEvent.preventDefault()
    }

    if (press === "pending") {
      session.timer = window.setTimeout(() => {
        session.press = nextPress(session.press, { kind: "timer" })
        if (drag.current !== session || session.press !== "armed") return
        liftRow()
        navigator.vibrate?.(10)
      }, LONG_PRESS_MS)
    }
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
    rowMotion,
    row: (id: string) => (node: HTMLElement | null) => {
      if (node) rowRefs.current.set(id, node)
      else rowRefs.current.delete(id)
    },
    press: (id: string) => ({
      onPointerDown: (event: ReactPointerEvent<HTMLElement>) => {
        swallowClick.current = false
        if (!orderable || event.pointerType !== "touch" || drag.current) return
        begin(id, event, "pending")
        setPressing(id)
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
