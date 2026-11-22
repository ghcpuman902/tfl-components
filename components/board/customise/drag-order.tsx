"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react"
import { GripVerticalIcon } from "lucide-react"
import {
  clampDrag,
  insertIndexFor,
  shiftFor,
  targetIndexFor,
} from "@/lib/drag-order-geometry"
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
  lifted?: {
    offsets: number[]
    heights: number[]
    from: number
    /** Viewport top of the row, and of the drop zone it may land in. */
    rowTop: number
    drop?: { top: number; bottom: number }
    /** Coming from the `adding` list: its resting top in list coordinates. */
    incoming?: number
  }
  target?: number
  over?: boolean
  /** An incoming row is over the list: it joins at `target` when let go. */
  into?: boolean
}

/** The lifted row, for rendering. */
type Lift = {
  id: string
  from: number
  target: number
  dy: number
  height: number
  /** Over the drop zone: it leaves the list when let go. */
  over: boolean
  /** From the `adding` list and over this one: the list opens a gap for it. */
  into: boolean
}

/** Rows outside the list that can be carried up into it (e.g. "Off the board"). */
export type AddFrom = {
  ids: readonly string[]
  onAdd: (id: string, index: number) => void
}

/** An area outside the list a row can be dropped on (e.g. "Off the board"). */
export type DropZone = {
  ref: RefObject<HTMLElement | null>
  canDrop: (id: string) => boolean
  onDrop: (id: string) => void
}

const PRESSING =
  "bg-muted scale-[0.98] transition-[scale,background-color] duration-350 ease-out motion-reduce:transition-none"
const LIFTED =
  "relative z-10 scale-[1.04] border-transparent bg-background shadow-lg transition-[scale,box-shadow] duration-150 ease-out motion-reduce:transition-none"
const SLIDING =
  "transition-transform duration-150 ease-out motion-reduce:transition-none"

/**
 * Registered up front: Chrome only lets a touchmove listener cancel scrolling
 * if it was there when the touch started. Returns the cleanup.
 */
const holdPageDuringDrag = (
  node: HTMLElement,
  drag: RefObject<Drag | null>
) => {
  const holdPage = (event: TouchEvent) => {
    if (drag.current && pressHoldsPage(drag.current.press))
      event.preventDefault()
  }
  node.addEventListener("touchmove", holdPage, { passive: false })
  return () => node.removeEventListener("touchmove", holdPage)
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
 * Vertical drag-to-reorder for a list: `<DragGrip {...grip(id)} />`,
 * `ref={row(id)}` and `{...rowMotion(id)}` on each row, `{...press(id)}` on
 * the part of the row a finger long-presses, and `listRef` on the list. The
 * row lifts and follows the pointer while the others slide aside. Mouse drags
 * the grip; touch holds a row (shaded while it builds), then drags, and a
 * quick swipe still scrolls; arrow keys on the grip move one place. With a
 * `dropZone`, a row can also be carried below the list and let go there.
 * With `adding`, rows of a second list (`addRef` on it; same `row`, `press`,
 * `grip` and `rowMotion` per row) can be carried up into this one; give the
 * list `style={{ paddingBottom: gap }}` so it grows to take them.
 */
export const useDragOrder = <T extends HTMLElement>({
  ids,
  onPlace,
  dropZone,
  adding,
}: {
  ids: readonly string[]
  onPlace: (id: string, index: number) => void
  dropZone?: DropZone
  adding?: AddFrom
}) => {
  const listRef = useRef<T | null>(null)
  const rowRefs = useRef(new Map<string, HTMLElement>())
  const drag = useRef<Drag | null>(null)
  const swallowClick = useRef(false)
  const refocus = useRef<string | null>(null)
  const addList = useRef<{ node: HTMLElement; off: () => void } | null>(null)
  const [lift, setLift] = useState<Lift | null>(null)
  const [pressing, setPressing] = useState<string | null>(null)
  const orderable = ids.length > 1 || dropZone !== undefined
  const isIncoming = (id: string) =>
    !ids.includes(id) && (adding?.ids.includes(id) ?? false)
  const canLift = (id: string) => (isIncoming(id) ? true : orderable)

  useEffect(() => {
    const list = listRef.current
    if (!list) return
    return holdPageDuringDrag(list, drag)
  }, [])
  // The adding list comes and goes (it is empty when every part is on).
  // Stable, so a re-render mid-touch keeps the listener it started with.
  const addRef = useCallback((node: HTMLElement | null) => {
    if (addList.current?.node === node) return
    addList.current?.off()
    addList.current = node
      ? { node, off: holdPageDuringDrag(node, drag) }
      : null
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
      const incoming = isIncoming(session.id)
      const nodes = ids.map((item) => rowRefs.current.get(item))
      // Layout boxes, not client rects: the press cue scales the row.
      const offsets = nodes.map((node) => node?.offsetTop ?? 0)
      const heights = nodes.map((node) => node?.offsetHeight ?? 0)
      const list = listRef.current
      const listTop =
        (list?.getBoundingClientRect().top ?? 0) + (list?.clientTop ?? 0)
      if (incoming) {
        // It joins after the last row; `from` is that virtual place.
        const node = rowRefs.current.get(session.id)
        const rect = node?.getBoundingClientRect()
        const height = node?.offsetHeight ?? 0
        // The press cue scales about the middle, so the middle holds.
        const top = rect ? rect.top + rect.height / 2 - height / 2 : 0
        const from = ids.length
        session.lifted = {
          offsets: [...offsets, top - listTop],
          heights: [...heights, height],
          from,
          rowTop: top,
          incoming: top - listTop,
        }
        session.target = from
        session.into = false
        setPressing(null)
        setLift({
          id: session.id,
          from,
          target: from,
          dy: 0,
          height,
          over: false,
          into: false,
        })
        return
      }
      const from = ids.indexOf(session.id)
      const zone =
        dropZone?.canDrop(session.id) === true
          ? dropZone.ref.current?.getBoundingClientRect()
          : undefined
      session.lifted = {
        offsets,
        heights,
        from,
        rowTop: listTop + (offsets[from] ?? 0),
        drop: zone ? { top: zone.top, bottom: zone.bottom } : undefined,
      }
      session.target = from
      setPressing(null)
      setLift({
        id: session.id,
        from,
        target: from,
        dy: 0,
        height: heights[from] ?? 0,
        over: false,
        into: false,
      })
    }
    const follow = (y: number) => {
      const lifted = session.lifted
      if (!lifted) return
      const { offsets, heights, from, rowTop, drop, incoming } = lifted
      const height = heights[from] ?? 0
      const raw = y - session.startY
      if (incoming !== undefined) {
        // Up as far as the list's top; not down past where it rests.
        const dy = Math.min(Math.max(raw, (offsets[0] ?? 0) - incoming), 0)
        const at = insertIndexFor(
          offsets.slice(0, from),
          heights.slice(0, from),
          incoming + dy
        )
        const into = at !== null
        const target = at ?? from
        session.target = target
        session.into = into
        setLift({ id: session.id, from, target, dy, height, over: false, into })
        return
      }
      const inList = clampDrag(offsets, heights, from, raw)
      // Past the list, the row's middle may travel down to the zone's bottom.
      const dy = drop
        ? Math.min(
            Math.max(raw, inList),
            Math.max(inList, drop.bottom - rowTop - height / 2)
          )
        : inList
      const over = drop ? rowTop + height / 2 + dy >= drop.top : false
      // Over the zone the list closes up behind the row.
      const target = over
        ? ids.length - 1
        : targetIndexFor(offsets, heights, from, inList)
      session.target = target
      session.over = over
      setLift({ id: session.id, from, target, dy, height, over, into: false })
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
      if (lifted?.incoming !== undefined) {
        if (commit && session.into && target !== undefined)
          adding?.onAdd(session.id, target)
      } else if (commit && lifted && session.over) dropZone?.onDrop(session.id)
      else if (
        commit &&
        lifted &&
        target !== undefined &&
        target !== lifted.from
      )
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
    if (isIncoming(id)) {
      // Up from the adding list: in at the end of this one.
      if (event.key !== "ArrowUp") return
      event.preventDefault()
      refocus.current = id
      adding?.onAdd(id, ids.length)
      return
    }
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
    if (lift?.id === id) {
      // The list grew by the row's height above it: stay under the pointer.
      const dy = lift.into ? lift.dy - lift.height : lift.dy
      return {
        className: LIFTED,
        style: { transform: `translateY(${dy}px)` },
      }
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
    addRef,
    /** The row being held over the drop zone, if any. */
    dropping: lift?.over ? lift.id : null,
    /** Room at the list's foot for a row coming in from the adding list. */
    gap: lift?.into ? lift.height : 0,
    rowMotion,
    row: (id: string) => (node: HTMLElement | null) => {
      if (node) rowRefs.current.set(id, node)
      else rowRefs.current.delete(id)
    },
    press: (id: string) => ({
      onPointerDown: (event: ReactPointerEvent<HTMLElement>) => {
        swallowClick.current = false
        if (!canLift(id) || event.pointerType !== "touch" || drag.current)
          return
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
      alone: !canLift(id),
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
  className,
}: {
  name: string
  alone: boolean
  onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void
  /** Extra classes on the grip's column (e.g. no inset on touch). */
  className?: string
}) => (
  <span className={cn(GRIP_SLOT, className)}>
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
