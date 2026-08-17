import type { HTMLAttributes, ReactNode } from "react"
import { CHIP_CAP_TEXT_BOX_CLASS } from "@/components/tfl/arrivals/chip-text"
import { cn } from "@/lib/utils"

export type QuietChipProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode
}

/** Quiet neutral chip used for status severity labels and arrival ranks. */
export const QuietChip = ({ children, className, ...props }: QuietChipProps) => (
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
