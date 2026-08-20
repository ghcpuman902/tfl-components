import type { HTMLAttributes, ReactNode } from "react"
import {
  ARRIVALS_RANK_CHIP_WIDTH_CLASS,
  CHIP_CAP_TEXT_BOX_CLASS,
  arrivalsOrdinalSuffix,
} from "@/components/tfl/arrivals/chip-text"
import { cn } from "@/lib/utils"

export type QuietChipProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode
}

/** Quiet neutral chip used for status severity labels and arrival ranks. */
export const QuietChip = ({
  children,
  className,
  ...props
}: QuietChipProps) => (
  <span
    {...props}
    className={cn(
      "inline-flex h-5 max-w-full shrink-0 items-center justify-center overflow-hidden bg-foreground/5 px-1.5 align-middle text-xs font-semibold text-foreground/60",
      className
    )}
  >
    <span className={CHIP_CAP_TEXT_BOX_CLASS}>{children}</span>
  </span>
)

/**
 * Unattended list position. Fixed `3ch`. Suffix uses OpenType `ordn` when
 * the face has it, with a raised fallback so `st`/`nd`/`rd`/`th` still sit
 * as superscripts.
 */
export const ArrivalRankChip = ({
  rank,
  className,
  ...props
}: { rank: number } & Omit<QuietChipProps, "children">) => (
  <QuietChip
    aria-hidden
    className={cn(
      ARRIVALS_RANK_CHIP_WIDTH_CLASS,
      "px-0 tabular-nums",
      className
    )}
    {...props}
  >
    {rank}
    <sup className="top-0 font-features-['ordn'] text-[0.62em] leading-none ordinal">
      {arrivalsOrdinalSuffix(rank)}
    </sup>
  </QuietChip>
)
