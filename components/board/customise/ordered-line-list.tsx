"use client"

import { ArrowUpToLineIcon, XIcon } from "lucide-react"
import {
  DragGrip,
  DropMarker,
  GRIP_SLOT,
  PRESS_SURFACE,
  ReorderHandle,
  ReorderToggle,
  useDragOrder,
} from "@/components/board/customise/drag-order"
import { ICON_BUTTON, lineName } from "@/components/board/customise/parts"
import { LineBadge } from "@/components/tfl/brand/line-badge"
import { cn } from "@/lib/utils"

/**
 * Vertical priority list. Drag the grip (on touch, hold a row then drag),
 * or use ⤒ to move a line to the top, or arrow keys on the grip. ✕ takes a
 * line out.
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
  const {
    listRef,
    row,
    press,
    grip,
    dragging,
    marker,
    variant,
    editing,
    setEditing,
    rowMotion,
  } = useDragOrder<HTMLOListElement>({ ids, onPlace })

  const list = (
    <ol
      ref={listRef}
      role="list"
      aria-label={label}
      className="relative border-y border-border"
    >
      {ids.map((id, index) => {
        const name = lineName(id)
        const motion = rowMotion(id)
        return (
          <li
            key={id}
            ref={row(id)}
            {...press(id)}
            className={cn(
              "flex min-h-11 items-center gap-1 border-b border-border last:border-b-0",
              PRESS_SURFACE,
              dragging === id && "opacity-40",
              motion.className
            )}
            style={motion.style}
          >
            {editing ? (
              <span aria-hidden className={GRIP_SLOT} />
            ) : (
              <DragGrip name={name} {...grip(id)} />
            )}
            <span className="w-6 shrink-0 text-right text-sm text-muted-foreground tabular-nums">
              {index + 1}
            </span>
            <span className="min-w-0 flex-1 px-1">
              <LineBadge lineId={id} name={name} />
            </span>
            {editing ? (
              <ReorderHandle name={name} {...grip(id)} />
            ) : (
              <>
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
              </>
            )}
          </li>
        )
      })}
      {marker ? <DropMarker top={marker.top} /> : null}
    </ol>
  )

  if (variant !== "b" || ids.length < 2) return list
  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <ReorderToggle
          editing={editing}
          onToggle={() => setEditing((value) => !value)}
        />
      </div>
      {list}
    </div>
  )
}
