import { FindableText } from "@/components/tfl/findable-text"
import {
  getLineNameTiers,
  joinLineNames,
  type LineNameTiers,
  type LineNameWidthBucket,
} from "@/lib/tfl/line-names"
import { cn } from "@/lib/utils"

export type LineNameProps = {
  /** Single line id — mutually exclusive with `lineIds`. */
  lineId?: string
  /** Explicit display name override / fallback for unknown ids. */
  name?: string
  /**
   * Multiple line ids for the shared-track convention
   * (e.g. Circle + H&C + Metropolitan). Mutually exclusive with `lineId`.
   */
  lineIds?: readonly string[]
  /** Optional per-id name overrides aligned with `lineIds`. */
  names?: readonly string[]
  className?: string
  /**
   * When true, allow a 2-line form only when there is no useful middle
   * abbreviation. Prefer full → middle → short; never stack tiers.
   * Shared-track groups ignore wrap (plate drops instead). Status board
   * headers keep `false`.
   */
  wrap?: boolean
  /**
   * Wider breakpoints — forced on when `lineIds` is set.
   */
  group?: boolean
  /**
   * When true (default), this node is `@container/line-name` and fills its
   * parent — right for board headers. When false, parent must establish the
   * container (e.g. LineBadgeGroup’s plate budget); paint shrink-wraps so
   * chips can side-fill.
   */
  establishContainer?: boolean
}

type TierPaint = {
  full: string
  middle: string
  short: string
  bucket: LineNameWidthBucket
  hasMiddle: boolean
  canWrapFull: boolean
}

const resolvePaint = (
  lineId: string | undefined,
  name: string | undefined,
  lineIds: readonly string[] | undefined,
  names: readonly string[] | undefined
): TierPaint => {
  if (lineIds && lineIds.length > 0) {
    const tiers = lineIds.map((id, index) =>
      getLineNameTiers(id, names?.[index])
    )
    const full = joinLineNames(tiers.map((t) => t.full))
    const middle = joinLineNames(tiers.map((t) => t.middle))
    const short = tiers.map((t) => t.short).join("/")
    return {
      full,
      middle,
      short,
      bucket: "long",
      hasMiddle: middle !== full,
      canWrapFull: /\s/.test(full),
    }
  }

  const id = lineId ?? ""
  const tiers: LineNameTiers = getLineNameTiers(id, name)
  return {
    full: tiers.full,
    middle: tiers.middle,
    short: tiers.short,
    bucket: tiers.bucket,
    hasMiddle: tiers.middle !== tiers.full,
    canWrapFull: /\s/.test(tiers.full),
  }
}

/**
 * Exclusive visibility ladders — same idea as PlatformChip.
 * Use `hidden` / `block` only. Never put `line-clamp-*` on these nodes
 * (it sets `display: -webkit-box` and fights `hidden`).
 */
const tierClasses = (options: {
  bucket: LineNameWidthBucket
  wrap: boolean
  group: boolean
  hasMiddle: boolean
  canWrapFull: boolean
  /** Joined group size — 3-line names need a wider full band than pairs. */
  lineCount: number
}): {
  fullOneLine: string
  fullTwoLine: string | null
  middle: string | null
  short: string
} => {
  const { bucket, wrap, group, hasMiddle, canWrapFull, lineCount } = options
  // 2-line full form: when wrap is on and there is no useful middle abbr.
  const useWrap = wrap && canWrapFull && !hasMiddle

  if (group) {
    if (hasMiddle) {
      // Shared-track chips: full → middle → short. No wrap.
      // Pairs (e.g. Circle + H&C) get full sooner; triples need more width
      // and drop to CIR/H&C/MET earlier when the plate budget is tight.
      if (lineCount >= 3) {
        return {
          fullOneLine: "hidden whitespace-nowrap @min-[24rem]/line-name:block",
          fullTwoLine: null,
          middle:
            "hidden whitespace-nowrap @min-[12rem]/line-name:block @min-[24rem]/line-name:hidden",
          short: "block whitespace-nowrap @min-[12rem]/line-name:hidden",
        }
      }
      return {
        fullOneLine: "hidden whitespace-nowrap @min-[14rem]/line-name:block",
        fullTwoLine: null,
        middle:
          "hidden whitespace-nowrap @min-[8rem]/line-name:block @min-[14rem]/line-name:hidden",
        short: "block whitespace-nowrap @min-[8rem]/line-name:hidden",
      }
    }
    if (useWrap) {
      return {
        fullOneLine: "hidden whitespace-nowrap @min-[18rem]/line-name:block",
        fullTwoLine:
          "hidden @min-[9rem]/line-name:block @min-[18rem]/line-name:hidden",
        middle: null,
        short: "block whitespace-nowrap @min-[9rem]/line-name:hidden",
      }
    }
    return {
      fullOneLine: "hidden whitespace-nowrap @min-[10rem]/line-name:block",
      fullTwoLine: null,
      middle: null,
      short: "block whitespace-nowrap @min-[10rem]/line-name:hidden",
    }
  }

  if (bucket === "long") {
    if (hasMiddle) {
      return {
        fullOneLine: "hidden whitespace-nowrap @min-[11rem]/line-name:block",
        fullTwoLine: null,
        middle:
          "hidden whitespace-nowrap @min-[4.5rem]/line-name:block @min-[11rem]/line-name:hidden",
        short: "block whitespace-nowrap @min-[4.5rem]/line-name:hidden",
      }
    }
    if (useWrap) {
      return {
        fullOneLine: "hidden whitespace-nowrap @min-[12rem]/line-name:block",
        fullTwoLine:
          "hidden @min-[6rem]/line-name:block @min-[12rem]/line-name:hidden",
        middle: null,
        short: "block whitespace-nowrap @min-[6rem]/line-name:hidden",
      }
    }
    return {
      fullOneLine: "hidden whitespace-nowrap @min-[11rem]/line-name:block",
      fullTwoLine: null,
      middle: null,
      short: "block whitespace-nowrap @min-[11rem]/line-name:hidden",
    }
  }

  if (bucket === "medium") {
    if (useWrap) {
      return {
        fullOneLine: "hidden whitespace-nowrap @min-[10rem]/line-name:block",
        fullTwoLine:
          "hidden @min-[5.5rem]/line-name:block @min-[10rem]/line-name:hidden",
        middle: null,
        short: "block whitespace-nowrap @min-[5.5rem]/line-name:hidden",
      }
    }
    return {
      fullOneLine: "hidden whitespace-nowrap @min-[8rem]/line-name:block",
      fullTwoLine: null,
      middle: null,
      short: "block whitespace-nowrap @min-[8rem]/line-name:hidden",
    }
  }

  if (useWrap) {
    return {
      fullOneLine: "hidden whitespace-nowrap @min-[8rem]/line-name:block",
      fullTwoLine:
        "hidden @min-[4.5rem]/line-name:block @min-[8rem]/line-name:hidden",
      middle: null,
      short: "block whitespace-nowrap @min-[4.5rem]/line-name:hidden",
    }
  }
  return {
    fullOneLine: "hidden whitespace-nowrap @min-[6rem]/line-name:block",
    fullTwoLine: null,
    middle: null,
    short: "block whitespace-nowrap @min-[6rem]/line-name:hidden",
  }
}

/**
 * Smart line-name label. Steps full → middle (H&C / W&C) → 3-letter code
 * via `@container/line-name` queries — same CSS-first pattern as PlatformChip.
 *
 * Pass `lineIds` for the TfL shared-track convention
 * ("Circle, H&C and Metropolitan").
 */
export const LineName = ({
  lineId,
  name,
  lineIds,
  names,
  className,
  wrap = false,
  group = false,
  establishContainer = true,
}: LineNameProps) => {
  const isGroup = group || Boolean(lineIds && lineIds.length > 0)
  const paint = resolvePaint(lineId, name, lineIds, names)
  const lineCount = lineIds?.length ?? (lineId ? 1 : 0)
  const classes = tierClasses({
    bucket: paint.bucket,
    wrap,
    group: isGroup,
    hasMiddle: paint.hasMiddle,
    canWrapFull: paint.canWrapFull,
    lineCount,
  })

  return (
    <FindableText
      text={paint.full}
      className={cn(
        establishContainer
          ? "@container/line-name block w-full max-w-full min-w-0"
          : "inline-block w-fit max-w-full",
        className
      )}
    >
      <span className={classes.fullOneLine} aria-hidden>
        {paint.full}
      </span>
      {classes.fullTwoLine ? (
        <span className={classes.fullTwoLine} aria-hidden>
          {/* Clamp on the inner node so it cannot override display:none. */}
          <span className="line-clamp-2 text-pretty">{paint.full}</span>
        </span>
      ) : null}
      {classes.middle ? (
        <span className={classes.middle} aria-hidden>
          {paint.middle}
        </span>
      ) : null}
      <span className={classes.short} aria-hidden>
        {paint.short}
      </span>
    </FindableText>
  )
}
