import { CHIP_CAP_SHIM_CLASS } from "@/components/tfl/arrivals/chip-text"
import { cn } from "@/lib/utils"

export type StopLetterBadgeSize = "sm" | "md"

/**
 * Painted bus stop letter — same red circle as the arrivals header.
 * Always a true circle: two-letter codes (`RG`, `CV`) keep the one-letter
 * disc and set a smaller, tighter glyph instead of growing into a pill.
 *
 * `md` (default) — title-scale disc; glyph leaves a clear ring.
 * `sm` — list-row mark; glyph fills more of the disc so it stays
 * readable at `text-sm`.
 *
 * Disc size lives on the outer mark (inherited font, so `ex` is the
 * surrounding text’s x-height). The glyph is a smaller inner span.
 * Do not set `font-size` in `ex` on the same node as `size-[…ex]`.
 *
 * The glyph sits at line-height 1 (`/none` on each size, so `cn` cannot
 * drop it) and CHIP_CAP_SHIM_CLASS centres its cap height in the disc,
 * with or without text-box-trim support.
 */
export const StopLetterBadge = ({
  letter,
  size = "md",
  className,
}: {
  letter: string
  size?: StopLetterBadgeSize
  className?: string
}) => {
  const isPair = letter.length > 1
  const isSm = size === "sm"
  return (
    <span
      data-line="buses"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-[var(--line-color)] align-middle font-bold text-[var(--line-ink)]",
        isSm ? "size-4" : "size-[1.85ex]",
        className
      )}
      aria-label={`Stop ${letter}`}
    >
      <span
        className={cn(
          CHIP_CAP_SHIM_CLASS,
          isSm
            ? isPair
              ? "text-[8px]/none tracking-tighter"
              : "text-[11px]/none"
            : isPair
              ? "text-[0.74ex]/none tracking-tighter"
              : "text-[0.92ex]/none"
        )}
      >
        {letter}
      </span>
    </span>
  )
}
