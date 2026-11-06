"use client"

import { PlusIcon, Undo2Icon } from "lucide-react"
import { OrderedLineList } from "@/components/board/customise/ordered-line-list"
import {
  SQUARE_CHECK,
  TEXT_LINK,
  lineName,
} from "@/components/board/customise/parts"
import type { CustomiseController } from "@/components/board/customise/types"
import { LineBadge } from "@/components/tfl/brand/line-badge"
import {
  addLine,
  moveLineToTop,
  placeLine,
  removeLine,
} from "@/lib/tfl/board-customise"
import { LINE_ORDER } from "tfl-ts"

/**
 * Status priority, shared by every variant: drag or ⤒ to reorder (Q3),
 * "Use the lines at X" with Undo after a station change (Q4), "Add a line"
 * inside the group (Q5).
 */
export const StatusPriority = ({ api }: { api: CustomiseController }) => {
  const pool = LINE_ORDER.filter((id) => !api.statusLines.includes(id))
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        {api.statusFollows
          ? `Lines at ${api.stationName} first, then the rest.`
          : "Your order first, then the rest."}
      </p>
      <div className="min-h-11">
        {api.statusPending ? (
          <button
            type="button"
            className={TEXT_LINK}
            onClick={api.followStationLines}
          >
            Use the lines at {api.stationName}
          </button>
        ) : api.undoStationLines ? (
          <button
            type="button"
            className={TEXT_LINK}
            onClick={api.undoStationLines}
          >
            <Undo2Icon className="mr-1.5 size-4" aria-hidden />
            Undo: back to your order
          </button>
        ) : null}
      </div>
      <OrderedLineList
        label="Status priority"
        ids={api.statusLines}
        onPlace={(lineId, index) =>
          api.setStatusLines(placeLine(api.statusLines, lineId, index), "drag")
        }
        onTop={(lineId) =>
          api.setStatusLines(moveLineToTop(api.statusLines, lineId), "top")
        }
        onRemove={(lineId) =>
          api.setStatusLines(removeLine(api.statusLines, lineId), "remove")
        }
      />
      {pool.length > 0 ? (
        <details className="group">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-sm">
            <PlusIcon className="size-4" aria-hidden />
            Add a line · {pool.length} more
          </summary>
          <ul
            aria-label="Lines you can add"
            className="flex flex-wrap gap-1.5 pb-2"
          >
            {pool.map((id) => (
              <li key={id}>
                <button
                  type="button"
                  aria-label={`Add ${lineName(id)}`}
                  className="inline-flex min-h-11 items-center"
                  onClick={() =>
                    api.setStatusLines(addLine(api.statusLines, id), "add")
                  }
                >
                  <LineBadge
                    lineId={id}
                    name={lineName(id)}
                    className="pointer-events-none"
                  />
                </button>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input
          type="checkbox"
          className={SQUARE_CHECK}
          checked={api.statusOnlyThese}
          onChange={(event) => api.setStatusOnlyThese(event.target.checked)}
        />
        Leave out the rest of the network
      </label>
    </div>
  )
}
