import { CHIP_CAP_SHIM_CLASS } from "@/components/tfl/arrivals/chip-text"
import { cn } from "@/lib/utils"

export type StopLetterBadgeSize = "sm" | "md"

/**
 * Painted bus stop letter — same red circle as the arrivals header.
 * One letter stays a circle; two-letter codes (`RG`, `CV`) grow into a pill.
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
 *
 * P22 overrides the shim for the single-letter glyphs (`md` 0.07em, `sm`
 * 0.04em). These are empirically tuned, not derived from metrics: Chromium
 * snaps the text baseline to whole CSS px, so the cap centre drifts with
 * page position and the offset that minimises the worst case differs per
 * size. Swept 0.02-0.09em at 8 sub-pixel page offsets in Chromium and
 * WebKit; see PR #38.
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
        isSm
          ? isPair
            ? "h-4 min-w-4 px-1"
            : "size-4"
          : isPair
            ? "h-[1.85ex] min-w-[1.85ex] px-[0.46ex]"
            : "size-[1.85ex]",
        className
      )}
      aria-label={`Stop ${letter}`}
    >
      <span
        className={cn(
          CHIP_CAP_SHIM_CLASS,
          isSm
            ? isPair
              ? "text-[9px]/none tracking-tighter"
              : "text-[11px]/none [[data-font=p22]_&]:translate-y-[0.04em]"
            : isPair
              ? "text-[0.82ex]/none tracking-tighter"
              : "text-[0.92ex]/none [[data-font=p22]_&]:translate-y-[0.07em]"
        )}
      >
        {letter}
      </span>
    </span>
  )
}
