"use client"

import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react"
import { cn } from "@/lib/utils"
import { FindableText } from "@/components/tfl/findable-text"
import {
  approximateStationMeasure,
  createCanvasStationMeasure,
  formatStationLabel,
  resolveSansFontFamily,
  type StationLabelFormatResult,
} from "@/lib/tfl/station-typography"
import { formatStationName } from "@/lib/tfl/diagram-station"
import {
  findCompletionForToken,
  stationCopyName,
  stationFindAliases,
  stationFindCoveredPhrases,
} from "@/lib/tfl/station-label-find"

export type StationNameLayout = "fixed" | "auto"

export type StationNameProps = {
  name: string
  className?: string
  style?: CSSProperties
  /**
   * Explicit visual lines (editorial / crowding recipes).
   * When set, skips auto word-break selection.
   */
  lines?: readonly string[]
  /**
   * `fixed` (default): use `lines` or a single canonical line — no measure/scale.
   * `auto`: measure the box and pick 1–2 lines / abbr / scale via formatStationLabel.
   */
  layout?: StationNameLayout
  /**
   * When set with `layout="auto"`, labels measure against this width instead
   * of the container. Useful for fixed diagram columns.
   */
  maxWidth?: number
  fontSize?: number
  maxLines?: 1 | 2
  allowAbbreviation?: boolean
  allowScaleDown?: boolean
  minScale?: number
  /**
   * @deprecated Prefer `lines`. Kept for call-site compatibility.
   */
  forcedLines?: readonly string[]
  /**
   * Canonical single-line name for aria + copy. Defaults to `formatStationName`.
   */
  accessibleName?: string
  /**
   * @deprecated No longer required — find/copy/aria always use the canonical name.
   */
  abbreviatedVisual?: boolean
  /** Align text within the label block. */
  align?: "left" | "center" | "right"
  /** Expose format diagnostics to a parent (typography lab). */
  onFormat?: (result: StationLabelFormatResult) => void
}

/** @deprecated Use `StationNameProps`. */
export type StationNameLabelProps = StationNameProps

type SizeState = {
  width: number
  fontSize: number
  fontFamily: string
  measured: boolean
}

const WIDTH_EPSILON = 0.5
const FONT_EPSILON = 0.05
const FALLBACK_FONT = "Hammersmith One, system-ui, sans-serif"
/** Unitless so wrapped lines stay clustered when `scale` shrinks font-size. */
const MULTILINE_LINE_HEIGHT = 1.15

/**
 * Invisible inline completion (e.g. St + "reet" → Street) for engines that
 * still index font-size: 0. Primary cross-line find uses FindPhrase below.
 */
const FindExpand = ({ text }: { text: string }) => (
  <span className="text-[0px] leading-none" aria-hidden="true">
    {text}
  </span>
)

const renderFindableLine = (line: string): ReactNode[] =>
  line.split(/(\s+|&)/).map((part, index) => {
    if (!part) return null
    const completion = findCompletionForToken(part)
    if (!completion) {
      return <Fragment key={`${part}-${index}`}>{part}</Fragment>
    }
    return (
      <Fragment key={`${part}-${index}`}>
        {part}
        <FindExpand text={completion} />
      </Fragment>
    )
  })

const fixedResult = (
  name: string,
  lines?: readonly string[]
): StationLabelFormatResult => {
  const displayName = formatStationName(name)
  if (lines && lines.length > 0) {
    return {
      lines: [...lines],
      scale: 1,
      abbreviated: lines.join(" ") !== displayName,
      fits: true,
      displayName,
    }
  }
  return {
    lines: [displayName],
    scale: 1,
    abbreviated: false,
    fits: true,
    displayName,
  }
}

/**
 * Station name UI contract: canonical copy / aria, find-in-page variants,
 * and optional visual line breaks. String-driven so non-TfL labels (pubs,
 * attractions) can use the same find/copy behaviour.
 *
 * Diagrams typically pass `lines` from a label recipe with `layout="fixed"`.
 * The typography lab uses `layout="auto"` + `maxWidth` to exercise fit policy.
 */
export const StationName = ({
  name,
  className,
  style,
  lines: linesProp,
  layout = "fixed",
  maxWidth: maxWidthProp,
  fontSize: fontSizeProp,
  maxLines = 2,
  allowAbbreviation = false,
  allowScaleDown = true,
  minScale,
  forcedLines,
  accessibleName: accessibleNameProp,
  align = "left",
  onFormat,
}: StationNameProps) => {
  const ref = useRef<HTMLSpanElement>(null)
  const visualLines = linesProp ?? forcedLines
  const useAuto = layout === "auto"
  const hasFixedMetrics =
    useAuto && maxWidthProp != null && maxWidthProp > 0 && fontSizeProp != null
  const copyName = stationCopyName(name, accessibleNameProp)

  const [size, setSize] = useState<SizeState>(() => ({
    width: maxWidthProp ?? 0,
    fontSize: fontSizeProp ?? 16,
    fontFamily: FALLBACK_FONT,
    measured: false,
  }))

  useEffect(() => {
    if (!useAuto) return
    const el = ref.current
    if (!el) return

    let cancelled = false
    const container = el.parentElement

    const readMetrics = () => {
      if (cancelled) return

      const width =
        maxWidthProp ??
        (container && container.clientWidth > 0
          ? container.clientWidth
          : el.clientWidth)

      const measuredFont =
        fontSizeProp ?? (Number.parseFloat(getComputedStyle(el).fontSize) || 16)
      const fontFamily = resolveSansFontFamily(el)

      setSize((prev) => {
        if (
          prev.measured &&
          Math.abs(prev.width - width) < WIDTH_EPSILON &&
          Math.abs(prev.fontSize - measuredFont) < FONT_EPSILON &&
          prev.fontFamily === fontFamily
        ) {
          return prev
        }
        return {
          width,
          fontSize: measuredFont,
          fontFamily,
          measured: true,
        }
      })
    }

    const waitFonts = async () => {
      try {
        if (document.fonts?.ready) await document.fonts.ready
      } catch {
        // Ignore font loading errors; approximate measure still works.
      }
      readMetrics()
    }

    void waitFonts()

    const observer = new ResizeObserver(() => readMetrics())
    if (container) observer.observe(container)
    else observer.observe(el)

    return () => {
      cancelled = true
      observer.disconnect()
    }
  }, [fontSizeProp, maxWidthProp, name, useAuto])

  const measure = useMemo(() => {
    if (!useAuto || !size.measured) return approximateStationMeasure
    return createCanvasStationMeasure(size.fontFamily)
  }, [size.fontFamily, size.measured, useAuto])

  const formatOptions = useMemo(
    () => ({
      maxWidth: Math.max(size.width, 1),
      fontSize: size.fontSize,
      maxLines,
      allowAbbreviation,
      allowScaleDown,
      minScale,
      forcedLines: visualLines,
    }),
    [
      allowAbbreviation,
      allowScaleDown,
      visualLines,
      maxLines,
      minScale,
      size.fontSize,
      size.width,
    ]
  )

  const result = useMemo(() => {
    if (!useAuto) return fixedResult(name, visualLines)

    // Unmeasured (or a ~0px slot) stays at full size. Pretending the box is
    // 1px wide forced minScale on every first paint, then a shrink-wrapped
    // parent ratcheted that small size even when the heading had room.
    // Tiles clip overflow; scale down only after a real slot width exists.
    if (!hasFixedMetrics && (!size.measured || size.width <= 4)) {
      return fixedResult(name, visualLines)
    }
    return formatStationLabel(name, measure, formatOptions)
  }, [
    formatOptions,
    hasFixedMetrics,
    measure,
    name,
    size.measured,
    size.width,
    useAuto,
    visualLines,
  ])

  useEffect(() => {
    if (!useAuto) {
      onFormat?.(result)
      return
    }
    if (!size.measured || size.width <= 0) return
    onFormat?.(result)
  }, [onFormat, result, size.measured, size.width, useAuto])

  const coveredPhrases = useMemo(
    () => stationFindCoveredPhrases(result.lines),
    [result.lines]
  )
  const findAliases = useMemo(
    () => stationFindAliases(copyName, result.lines),
    [copyName, result.lines]
  )

  const textAlign =
    align === "center" ? "center" : align === "right" ? "right" : "left"
  const multiline = result.lines.length > 1

  const paintDiffersFromCopy =
    multiline ||
    result.abbreviated ||
    result.lines.join(" ").replace(/\s+/g, " ").trim() !== copyName
  const extraFindAliases = findAliases.filter(
    (alias) => alias.toLowerCase() !== copyName.toLowerCase()
  )

  return (
    <FindableText
      ref={ref}
      text={copyName}
      aliases={extraFindAliases}
      coveredPhrases={coveredPhrases}
      paintMatchesText={!paintDiffersFromCopy}
      className={cn(
        "relative inline-flex h-full min-h-0 w-full min-w-0 flex-col justify-center",
        useAuto && maxWidthProp == null && "flex-1",
        !multiline && "leading-none",
        align === "center" && "items-center",
        align === "right" && "items-end",
        align === "left" && "items-start",
        className
      )}
      style={{
        ...style,
        fontSize: fontSizeProp != null ? `${fontSizeProp}px` : style?.fontSize,
        textAlign,
      }}
    >
      <span
        className="inline-block w-full min-w-0"
        style={{
          fontSize: result.scale !== 1 ? `${result.scale * 100}%` : undefined,
          // Unitless LH tracks scaled font-size; rem leading from callers would not.
          lineHeight: multiline ? MULTILINE_LINE_HEIGHT : undefined,
        }}
        aria-hidden="true"
        // `layout="auto"` intentionally repaints once the box is measured
        // (approximate → canvas fit can pick a different line break/scale
        // than the pre-measure guess). That's a post-hydration update, not a
        // markup mismatch, but suppress the warning on this node only —
        // never on the whole component — since the two passes can render
        // different characters/line breaks for the same props.
        suppressHydrationWarning={useAuto}
      >
        {result.lines.map((line, index) => (
          <Fragment key={`${line}-${index}`}>
            {index > 0 ? (
              <>
                <FindExpand text=" " />
                <br />
              </>
            ) : null}
            <span className="whitespace-nowrap">
              {renderFindableLine(line)}
            </span>
          </Fragment>
        ))}
      </span>
    </FindableText>
  )
}

/**
 * Flex slot for board identity titles (stop name, cycle area, status group).
 * `layout="auto"` measures this box — it must be a flex item with a definite
 * width (`flex-1 min-w-0`), not shrink-wrapped to the glyphs.
 */
export const STATION_NAME_TITLE_SLOT_CLASS =
  "flex h-full min-w-0 flex-1 items-center"

/**
 * Trim the line box to cap-height → alphabetic baseline (not full
 * ascent/descent) before centering. A title is a label for what sits below
 * it, not what's above — centering on cap-height (rather than including
 * descender space) reads as anchored to its content and nudges the glyphs
 * down a touch versus dead-center. Same technique as chip labels
 * (`CHIP_CAP_TEXT_BOX_CLASS`), applied here at title scale.
 */
const STATION_NAME_TITLE_CLASS =
  "justify-center leading-none [text-box:trim-both_cap_alphabetic]"

/** One-line auto-fit name for board identity rows. Visual only — set `aria-label` on the heading. */
export const StationNameTitle = ({
  name,
  className,
  end,
}: {
  name: string
  className?: string
  /** Sits after the name (e.g. disruption chips). The slot stays `flex-1` so auto-fit still measures leftover width. */
  end?: ReactNode
}) => (
  <span
    className={cn(
      STATION_NAME_TITLE_SLOT_CLASS,
      end != null && "gap-x-1.5",
      className
    )}
  >
    <span aria-hidden="true" className="contents">
      <StationName
        name={name}
        layout="auto"
        maxLines={1}
        allowAbbreviation
        allowScaleDown
        className={cn(
          STATION_NAME_TITLE_CLASS,
          end != null && "w-auto flex-none"
        )}
      />
    </span>
    {end}
  </span>
)

/** @deprecated Prefer `StationName`. */
export const StationNameLabel = StationName
