"use client"

import { ArrowUpToLineIcon, XIcon } from "lucide-react"
import {
  DragGrip,
  DropMarker,
  useDragOrder,
} from "@/components/board/customise/drag-order"
import { ICON_BUTTON, lineName } from "@/components/board/customise/parts"
import { LineBadge } from "@/components/tfl/brand/line-badge"
import { cn } from "@/lib/utils"

/**
 * Vertical priority list. Drag the grip, or use ⤒ to move a line to the top,
 * or arrow keys on the grip. ✕ takes a line out.
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
  const { listRef, row, grip, dragging, marker } =
    useDragOrder<HTMLOListElement>({ ids, onPlace })

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
            ref={row(id)}
            className={cn(
              "flex min-h-11 items-center gap-1 border-b border-border last:border-b-0",
              dragging === id && "opacity-40"
            )}
          >
            <DragGrip name={name} {...grip(id)} />
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
      {marker ? <DropMarker top={marker.top} /> : null}
    </ol>
  )
}
