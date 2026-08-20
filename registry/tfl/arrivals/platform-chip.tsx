import { CHIP_CAP_TEXT_BOX_CLASS } from "@/components/tfl/arrivals/chip-text"
import { cn } from "@/lib/utils"

export type PlatformChipProps = {
  /** Platform number / letter as shown after “Platform” (e.g. `"1"`, `"A"`). */
  number: string
  className?: string
  /**
   * Always paint `P{n}`. Use on a row when the subgroup heading is not the
   * platform (platforms vary inside the bound). Default is the width ladder.
   */
  compact?: boolean
}

/**
 * Rail platform chip. Visual form steps with board width via `@container/arrivals`;
 * aria always “Platform N”. Casing stays title-style; centering uses cap text-box trim.
 *
 * Platform 1 → Plat 1 → P1 → 1
 *
 * `@container/arrivals` reads the whole board, not this chip's own column —
 * CSS can't see how much space a sibling (the destination name) actually
 * needs. Each breakpoint is that tier's own rendered width (measured) plus
 * the row's other fixed content (due-time column, two `gap-x-3` gaps, `px-2`
 * row padding ≈ 84px) plus one more `gap-x-3` (12px) as buffer — reusing the
 * row's own spacing token rather than a round-number guess. That keeps the
 * wider label alive as long as the row can actually fit it, instead of
 * dropping to a shorter form while there's still visible slack next to a
 * short destination name.
 */
export const PlatformChip = ({
  number,
  className,
  compact = false,
}: PlatformChipProps) => (
  <span
    className={cn(
      "inline-flex h-5 shrink-0 items-center justify-center bg-muted-foreground px-1.5 text-xs font-semibold text-background tabular-nums",
      className
    )}
    aria-label={`Platform ${number}`}
  >
    {compact ? (
      <span className={CHIP_CAP_TEXT_BOX_CLASS} aria-hidden>
        P{number}
      </span>
    ) : (
      <>
        <span
          className={cn(
            "@min-[11rem]/arrivals:hidden",
            CHIP_CAP_TEXT_BOX_CLASS
          )}
          aria-hidden
        >
          {number}
        </span>
        <span
          className={cn(
            "hidden @min-[11rem]/arrivals:inline @min-[12.5rem]/arrivals:hidden",
            CHIP_CAP_TEXT_BOX_CLASS
          )}
          aria-hidden
        >
          P{number}
        </span>
        <span
          className={cn(
            "hidden @min-[12.5rem]/arrivals:inline @min-[14rem]/arrivals:hidden",
            CHIP_CAP_TEXT_BOX_CLASS
          )}
          aria-hidden
        >
          Plat {number}
        </span>
        <span
          className={cn(
            "hidden @min-[14rem]/arrivals:inline",
            CHIP_CAP_TEXT_BOX_CLASS
          )}
          aria-hidden
        >
          Platform {number}
        </span>
      </>
    )}
  </span>
)
