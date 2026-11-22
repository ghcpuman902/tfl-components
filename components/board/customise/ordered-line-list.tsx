"use client"

import { useRef, type ReactNode } from "react"
import { ArrowUpToLineIcon, PlusIcon, XIcon } from "lucide-react"
import {
  DragGrip,
  PRESS_SURFACE,
  useDragOrder,
} from "@/components/board/customise/drag-order"
import {
  ICON_BUTTON,
  SectionHeading,
  lineName,
} from "@/components/board/customise/parts"
import { LineBadge } from "@/components/tfl/brand/line-badge"
import { cn } from "@/lib/utils"

/** What a row shows: its name (for labels) and its body. */
export type OrderedItem = { name: string; body: ReactNode }

/** Drag a row here to hide it; hidden rows come back with +. */
export type HiddenZone = {
  hint: string
  ids: readonly string[]
  canHide: (id: string) => boolean
  onHide: (id: string) => void
  onShow: (id: string) => void
}

const lineItem = (id: string): OrderedItem => ({
  name: lineName(id),
  body: <LineBadge lineId={id} name={lineName(id)} />,
})

/**
 * Vertical priority list. Drag the grip (on touch, hold a row then drag),
 * or use ⤒ to move a line to the top, or arrow keys on the grip. ✕ takes a
 * line out. With `hidden`, a row can also be dragged into a Hidden zone
 * below the list; `flush` drops the touch inset so rows start at the edge.
 */
export const OrderedLineList = ({
  label,
  ids,
  onPlace,
  onTop,
  onRemove,
  item = lineItem,
  hidden,
  footer,
  flush = false,
  align = "center",
}: {
  label: string
  ids: readonly string[]
  onPlace: (lineId: string, index: number) => void
  onTop?: (lineId: string) => void
  onRemove?: (lineId: string) => void
  item?: (id: string) => OrderedItem
  hidden?: HiddenZone
  /** Between the list and the Hidden zone. */
  footer?: ReactNode
  flush?: boolean
  /** `top`: rows whose body can wrap keep every part on the first line, with a tighter left side. */
  align?: "center" | "top"
}) => {
  const top = align === "top"
  const zoneRef = useRef<HTMLDivElement | null>(null)
  const { listRef, row, press, grip, rowMotion, dropping } =
    useDragOrder<HTMLOListElement>({
      ids,
      onPlace,
      dropZone: hidden
        ? { ref: zoneRef, canDrop: hidden.canHide, onDrop: hidden.onHide }
        : undefined,
    })

  return (
    <>
      <ol
        ref={listRef}
        role="list"
        aria-label={label}
        className="relative border-y border-border"
      >
        {ids.map((id, index) => {
          const { name, body } = item(id)
          const motion = rowMotion(id)
          return (
            <li
              key={id}
              ref={row(id)}
              {...press(id)}
              className={cn(
                "flex min-h-11 gap-1 border-b border-border last:border-b-0",
                top ? "items-start" : "items-center",
                PRESS_SURFACE,
                motion.className
              )}
              style={motion.style}
            >
              <DragGrip
                name={name}
                {...grip(id)}
                className={cn(
                  flush && "pointer-coarse:w-0",
                  top && "items-start [&>button]:h-11"
                )}
              />
              <span
                className={cn(
                  "shrink-0 text-right text-sm text-muted-foreground tabular-nums",
                  top ? "w-4 pt-3 leading-5" : "w-6"
                )}
              >
                {index + 1}
              </span>
              <span
                className={cn(
                  "flex min-w-0 flex-1 gap-2",
                  top ? "items-start py-2.5 pl-1" : "items-center px-1"
                )}
              >
                {body}
              </span>
              {onTop ? (
                <button
                  type="button"
                  aria-label={`Move ${name} to top`}
                  disabled={index === 0}
                  className={ICON_BUTTON}
                  onClick={() => onTop(id)}
                >
                  <ArrowUpToLineIcon className="size-5" aria-hidden />
                </button>
              ) : null}
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
      </ol>
      {footer}
      {hidden ? (
        <div className="space-y-1 pt-4">
          <SectionHeading>Hidden</SectionHeading>
          <div
            ref={zoneRef}
            className={cn(
              "border-y border-dashed border-foreground/40 px-3 py-2 text-sm text-muted-foreground",
              dropping && "bg-muted text-foreground"
            )}
          >
            {hidden.hint}
          </div>
          {hidden.ids.length > 0 ? (
            <div className="pt-3">
              <ul aria-label="Hidden" className="border-y border-border">
                {hidden.ids.map((id) => {
                  const { name, body } = item(id)
                  return (
                    <li
                      key={id}
                      className={cn(
                        "flex min-h-11 gap-1 border-b border-border last:border-b-0",
                        top ? "items-start" : "items-center"
                      )}
                    >
                      <span
                        className={cn(
                          "flex min-w-0 flex-1 gap-2 opacity-60",
                          top ? "items-start py-2.5" : "items-center"
                        )}
                      >
                        {body}
                      </span>
                      <button
                        type="button"
                        aria-label={`Show ${name} again`}
                        className={ICON_BUTTON}
                        onClick={() => hidden.onShow(id)}
                      >
                        <PlusIcon className="size-5" aria-hidden />
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  )
}
