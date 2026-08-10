import { CHIP_CAP_TEXT_BOX_CLASS } from "@/components/tfl/arrivals/chip-text";
import { TFL_MODAL_COLOURS } from "@/lib/tfl/brand-colours";
import { cn } from "@/lib/utils";

export type BusNumberChipProps = {
  /** Route code (e.g. `"73"`, `"N253"`, `"EL1"`). */
  label: string;
  className?: string;
};

/**
 * Bus route-number chip — TfL bus red, fixed `5ch`, square corners.
 * Label casing unchanged; centering uses cap (uppercase) text-box trim.
 */
export const BusNumberChip = ({ label, className }: BusNumberChipProps) => (
  <span
    className={cn(
      "inline-flex h-5 w-[5ch] shrink-0 items-center justify-center text-center text-xs font-bold tabular-nums text-white",
      CHIP_CAP_TEXT_BOX_CLASS,
      className,
    )}
    style={{ backgroundColor: TFL_MODAL_COLOURS.buses.hex }}
    aria-label={`Route ${label}`}
  >
    {label}
  </span>
);
