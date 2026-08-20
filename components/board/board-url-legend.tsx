import type { BoardHrefSegment } from "@/lib/tfl/board-url-state"
import type { BoardSettingId } from "@/lib/tfl/board-settings"
import { cn } from "@/lib/utils"

/** 1-based index of a setting in the live URL segment list, or null if omitted. */
export const boardSegmentIndex = (
  segments: readonly BoardHrefSegment[],
  setting: BoardSettingId | "key"
): number | null => {
  const index = segments.findIndex((segment) => segment.setting === setting)
  return index === -1 ? null : index + 1
}

/**
 * Circled index for Config labels / URL map.
 * Digit is painted via `::after` + `data-n` so text selection never includes it.
 */
export const BoardSegmentBadge = ({
  index,
  className,
}: {
  index: number | null
  className?: string
}) => {
  if (index === null) return null
  return (
    <span
      className={cn(
        "inline-flex size-4 shrink-0 items-center justify-center rounded-full border border-foreground/35 text-[0.6rem] leading-none text-foreground tabular-nums select-none after:content-[attr(data-n)]",
        className
      )}
      data-n={String(index)}
      aria-hidden
    />
  )
}

/**
 * Numbered URL map — path + underlined hash params with circled indices below.
 * Numbers are decorative (`select-none`) and are not part of a text selection.
 */
export const BoardUrlLegend = ({
  path,
  segments,
  className,
}: {
  /** Absolute or relative path before the hash (e.g. origin + `/board/view`). */
  path: string
  segments: readonly BoardHrefSegment[]
  className?: string
}) => (
  <div
    className={cn(
      "overflow-x-auto rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-foreground",
      className
    )}
    aria-label="Board URL"
  >
    <div className="flex min-w-min items-end gap-0 font-mono">
      <span className="shrink-0 pb-5 text-muted-foreground">
        {path}
        {segments.length > 0 ? "#" : ""}
      </span>
      {segments.map((segment, index) => (
        <span
          key={`${segment.setting}-${segment.text}`}
          className="relative flex items-end"
        >
          {index > 0 ? (
            <span className="shrink-0 pb-5 text-muted-foreground">&</span>
          ) : null}
          <span className="inline-flex flex-col items-center">
            <span className="border-b border-foreground pb-0.5 whitespace-nowrap">
              {segment.text}
            </span>
            {/* Absolute so the badge sits under the segment but outside selection flow */}
            <span className="pointer-events-none mt-1 select-none" aria-hidden>
              <BoardSegmentBadge index={index + 1} />
            </span>
          </span>
        </span>
      ))}
    </div>
  </div>
)
