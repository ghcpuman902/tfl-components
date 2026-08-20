import type { CSSProperties } from "react"
import {
  ARRIVALS_IDENTITY_CHIP_WIDTH_CLASS,
  CHIP_CAP_TEXT_BOX_CLASS,
} from "@/components/tfl/arrivals/chip-text"
import { TFL_MODAL_COLOURS } from "@/lib/tfl/brand-colours"
import { riverRouteChipCopy } from "@/lib/tfl/river-bus"
import { cn } from "@/lib/utils"

export type RiverRouteChipProps = {
  /** Line id (`rb1`, `woolwich-ferry`). */
  lineId?: string
  /** Display name from TfL (`RB1`, `Woolwich Ferry`). */
  lineName?: string
  className?: string
  style?: CSSProperties
}

/**
 * River-bus route chip — River Services blue, fixed `5ch`, square corners.
 * Woolwich Ferry paints `WF`; the accessible name stays the full line name.
 */
export const RiverRouteChip = ({
  lineId,
  lineName,
  className,
  style,
}: RiverRouteChipProps) => {
  const { label, ariaLabel } = riverRouteChipCopy(lineId, lineName)
  if (!label) return null
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center justify-center text-center text-xs font-bold text-white tabular-nums",
        ARRIVALS_IDENTITY_CHIP_WIDTH_CLASS,
        className
      )}
      style={{ backgroundColor: TFL_MODAL_COLOURS.river.hex, ...style }}
      aria-label={ariaLabel}
    >
      <span className={CHIP_CAP_TEXT_BOX_CLASS}>{label}</span>
    </span>
  )
}
