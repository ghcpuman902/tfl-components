"use client"

import { useCallback, useState, type ReactNode } from "react"
import { CheckIcon, XIcon } from "lucide-react"
import { DocsResizeFrame } from "@/components/docs/docs-resize-frame"
import { CHIP_CAP_TEXT_BOX_CLASS } from "@/components/tfl/arrivals/chip-text"
import { PlatformChip } from "@/components/tfl/arrivals/platform-chip"
import { BusNumberChip } from "@/components/tfl/arrivals/bus-number-chip"
import { StationName } from "@/components/tfl/station-name"
import {
  STATION_LABEL_MIN_SCALE,
  type StationLabelFormatResult,
} from "@/lib/tfl/station-typography"
import { TFL_BLUE } from "@/lib/tfl/brand"
import { cn } from "@/lib/utils"

/** Shared do/don't row — green tick or red cross, verdict text alongside a live example. */
const Verdict = ({
  good,
  label,
  children,
}: {
  good: boolean
  label: string
  children: ReactNode
}) => (
  <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
    <span
      className={cn(
        "mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full",
        good
          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
          : "bg-red-500/15 text-red-600 dark:text-red-400"
      )}
      aria-hidden
    >
      {good ? (
        <CheckIcon className="size-3.5" strokeWidth={3} />
      ) : (
        <XIcon className="size-3.5" strokeWidth={3} />
      )}
    </span>
    <div className="min-w-0 flex-1 space-y-2">
      <p className="text-xs font-medium text-muted-foreground">
        {good ? "Do" : "Don’t"} — {label}
      </p>
      {children}
    </div>
  </div>
)

/**
 * Tracking (letter-spacing) reads differently on caps vs sentence case.
 * Uppercase glyphs are uniform-height with no ascenders/descenders, so
 * tightened or widened tracking still reads cleanly. The same adjustment on
 * lowercase collides round letters (rn/m, cl/d) and crowds ascenders.
 */
export const TrackingRuleDemo = () => (
  <div className="grid gap-3 sm:grid-cols-2">
    <Verdict good label="tighten tracking on uppercase labels">
      <p className="text-sm font-semibold tracking-tighter text-foreground uppercase">
        Now boarding
      </p>
      <p className="text-xs text-muted-foreground">
        <code className="text-[11px]">uppercase tracking-tighter</code> — caps
        have no ascenders or descenders, so tighter spacing still separates each
        letter.
      </p>
    </Verdict>
    <Verdict good={false} label="tighten tracking on lowercase text">
      <p className="text-sm font-semibold tracking-tighter text-foreground normal-case">
        now boarding all passengers
      </p>
      <p className="text-xs text-muted-foreground">
        Same <code className="text-[11px]">tracking-tighter</code> value on
        sentence case — round letters touch and ascenders crowd their
        neighbours. Keep lowercase at{" "}
        <code className="text-[11px]">tracking-normal</code>.
      </p>
    </Verdict>
  </div>
)

const platformChipClassName =
  "inline-flex h-6 shrink-0 items-center justify-center bg-muted-foreground px-2 text-xs font-semibold text-background"

/**
 * Chips centre optically using a cap-height text-box trim, not x-height.
 * Labels keep their real casing ("Plat 4", not "PLAT 4") — forcing
 * `uppercase` overrides that source casing on every chip regardless of what
 * the label was meant to say.
 */
export const ChipTextDemo = () => (
  <div className="grid gap-3 sm:grid-cols-2">
    <Verdict good label="keep the label’s own casing">
      <div className="flex flex-wrap items-center gap-2">
        <span className={platformChipClassName} aria-label="Platform 4">
          <span className={CHIP_CAP_TEXT_BOX_CLASS} aria-hidden>
            Plat 4
          </span>
        </span>
        <PlatformChip number="4" />
        <BusNumberChip label="N253" />
      </div>
      <p className="text-xs text-muted-foreground">
        Text sits in a{" "}
        <code className="text-[11px]">[text-box:trim-both_cap_alphabetic]</code>{" "}
        box, so it centres on cap-height without extra padding — whatever casing
        the label was written in.
      </p>
    </Verdict>
    <Verdict good={false} label="force uppercase on chip text">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(platformChipClassName, "uppercase")}
          aria-label="Platform 4"
        >
          <span className={CHIP_CAP_TEXT_BOX_CLASS} aria-hidden>
            Plat 4
          </span>
        </span>
        <span
          className={cn(platformChipClassName, "uppercase")}
          aria-label="Route N253"
        >
          <span className={CHIP_CAP_TEXT_BOX_CLASS} aria-hidden>
            n253
          </span>
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        Platform and route chips are written{" "}
        <code className="text-[11px]">Plat 4</code>, not{" "}
        <code className="text-[11px]">PLAT 4</code>. Forcing{" "}
        <code className="text-[11px]">uppercase</code> overrides that source
        casing and makes every chip shout, whether or not the label was meant
        to.
      </p>
    </Verdict>
  </div>
)

const MIN_SIZE_LABEL_FONT = 16
const MIN_SIZE_NAME = "Caledonian Road & Barnsbury"
const MIN_SIZE_DEFAULT_WIDTH = 220

type FormatReadout = {
  scale: number
  abbreviated: boolean
  fits: boolean
  label: string
}

const readoutMessage = (
  readout: FormatReadout | null,
  allowsAbbreviation: boolean
): { good: boolean; text: string } => {
  if (!readout) return { good: true, text: "Measuring…" }
  const px = Math.round(MIN_SIZE_LABEL_FONT * readout.scale)

  if (readout.abbreviated) {
    return {
      good: true,
      text: `Abbreviated to "${readout.label}" at ${px}px, back to a comfortable size.`,
    }
  }
  if (!allowsAbbreviation && readout.scale <= STATION_LABEL_MIN_SCALE) {
    return {
      good: false,
      text: `Scaled to ${px}px (${Math.round(readout.scale * 100)}% of ${MIN_SIZE_LABEL_FONT}px). This is at or past the floor. Stop shrinking and abbreviate.`,
    }
  }
  if (readout.scale < 1) {
    return {
      good: true,
      text: `Full name scaled to ${px}px. Drag narrower to see where it reaches the 12px floor.`,
    }
  }
  return { good: true, text: `Full name at ${px}px. Plenty of room.` }
}

const MinSizeRow = ({
  title,
  allowAbbreviation,
  minScale,
}: {
  title: string
  allowAbbreviation: boolean
  minScale: number
}) => {
  const [readout, setReadout] = useState<FormatReadout | null>(null)
  const verdict = readoutMessage(readout, allowAbbreviation)

  // Stable identity — StationName re-invokes onFormat inside a useEffect
  // keyed on this callback; an inline arrow would recreate it every render
  // and set up an infinite update loop.
  const handleFormat = useCallback((result: StationLabelFormatResult) => {
    setReadout({
      scale: result.scale,
      abbreviated: result.abbreviated,
      fits: result.fits,
      label: result.lines.join(" "),
    })
  }, [])

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <div
        className="flex items-center px-3 py-2.5 text-white"
        style={{ backgroundColor: TFL_BLUE }}
      >
        <StationName
          name={MIN_SIZE_NAME}
          layout="auto"
          fontSize={MIN_SIZE_LABEL_FONT}
          maxLines={1}
          allowAbbreviation={allowAbbreviation}
          allowScaleDown
          minScale={minScale}
          onFormat={handleFormat}
          className="font-medium text-white"
        />
      </div>
      <p
        className={cn(
          "flex items-start gap-1.5 text-xs",
          verdict.good ? "text-muted-foreground" : "text-destructive"
        )}
      >
        {verdict.good ? (
          <CheckIcon
            className="mt-0.5 size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400"
            strokeWidth={3}
          />
        ) : (
          <XIcon
            className="mt-0.5 size-3.5 shrink-0 text-destructive"
            strokeWidth={3}
          />
        )}
        <span>{verdict.text}</span>
      </p>
    </div>
  )
}

/**
 * Drag the handle narrower and watch the same station name take two
 * different paths: keep scaling type down forever, or abbreviate once and
 * stay near a legible size. `STATION_LABEL_MIN_SCALE` (0.75) is the codified
 * floor — treat it as the point to change strategy, not a target to reach.
 */
export const MinimumSizeDemo = () => (
  <DocsResizeFrame
    defaultWidth={MIN_SIZE_DEFAULT_WIDTH}
    minWidth={70}
    className="min-w-17.5 p-3"
    captionSuffix=" · drag to resize"
  >
    <div className="space-y-4">
      <MinSizeRow
        title="Keeps shrinking without abbreviations"
        allowAbbreviation={false}
        minScale={0.4}
      />
      <MinSizeRow
        title="Abbreviates at the 12px floor"
        allowAbbreviation
        minScale={STATION_LABEL_MIN_SCALE}
      />
    </div>
  </DocsResizeFrame>
)
