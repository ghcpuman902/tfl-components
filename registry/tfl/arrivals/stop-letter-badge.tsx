import { CHIP_CAP_TEXT_BOX_CLASS } from "@/components/tfl/arrivals/chip-text"
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
          CHIP_CAP_TEXT_BOX_CLASS,
          isSm
            ? isPair
              ? "text-[9px] tracking-tighter"
              : "text-[11px]"
            : isPair
              ? "text-[0.82ex] tracking-tighter"
              : "text-[0.92ex]"
        )}
      >
        {letter}
      </span>
    </span>
  )
}
