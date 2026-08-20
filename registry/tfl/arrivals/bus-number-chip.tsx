import type { CSSProperties } from "react"
import {
  ARRIVALS_IDENTITY_CHIP_WIDTH_CLASS,
  CHIP_CAP_TEXT_BOX_CLASS,
} from "@/components/tfl/arrivals/chip-text"
import { TFL_MODAL_COLOURS } from "@/lib/tfl/brand-colours"
import { cn } from "@/lib/utils"

export type BusNumberChipProps = {
  /** Route code (e.g. `"73"`, `"N253"`, `"EL1"`). */
  label: string
  className?: string
  /**
   * Merged over the default bus-red fill — e.g. a `maskImage` cutout for a
   * corner badge. Extends, never replaces, `backgroundColor`.
   */
  style?: CSSProperties
}

/**
 * Bus route-number chip — TfL bus red, fixed `5ch`, square corners.
 * Label casing unchanged; centering uses cap (uppercase) text-box trim.
 */
export const BusNumberChip = ({
  label,
  className,
  style,
}: BusNumberChipProps) => (
  <span
    className={cn(
      "inline-flex h-5 shrink-0 items-center justify-center text-center text-xs font-bold text-white tabular-nums",
      ARRIVALS_IDENTITY_CHIP_WIDTH_CLASS,
      className
    )}
    style={{ backgroundColor: TFL_MODAL_COLOURS.buses.hex, ...style }}
    aria-label={`Route ${label}`}
  >
    <span className={CHIP_CAP_TEXT_BOX_CLASS}>{label}</span>
  </span>
)
