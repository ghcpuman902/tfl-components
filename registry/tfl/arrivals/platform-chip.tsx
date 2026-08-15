import { CHIP_CAP_TEXT_BOX_CLASS } from "@/components/tfl/arrivals/chip-text";
import { cn } from "@/lib/utils";

export type PlatformChipProps = {
  /** Platform number / letter as shown after “Platform” (e.g. `"1"`, `"A"`). */
  number: string;
  className?: string;
  /**
   * Always paint `P{n}`. Use on a row when the subgroup heading is not the
   * platform (platforms vary inside the bound). Default is the width ladder.
   */
  compact?: boolean;
};

/**
 * Rail platform chip. Visual form steps with board width via `@container/arrivals`;
 * aria always “Platform N”. Casing stays title-style; centering uses cap text-box trim.
 *
 * Platform 1 → Plat 1 → P1 → 1
 */
export const PlatformChip = ({
  number,
  className,
  compact = false,
}: PlatformChipProps) => (
  <span
    className={cn(
      "inline-flex h-5 shrink-0 items-center justify-center bg-muted-foreground px-1.5 text-xs font-semibold tabular-nums text-background",
      CHIP_CAP_TEXT_BOX_CLASS,
      className,
    )}
    aria-label={`Platform ${number}`}
  >
    {compact ? (
      <span aria-hidden>P{number}</span>
    ) : (
      <>
        <span className="@min-[18rem]/arrivals:hidden" aria-hidden>
          {number}
        </span>
        <span
          className="hidden @min-[18rem]/arrivals:inline @min-[26rem]/arrivals:hidden"
          aria-hidden
        >
          P{number}
        </span>
        <span
          className="hidden @min-[26rem]/arrivals:inline @min-[34rem]/arrivals:hidden"
          aria-hidden
        >
          Plat {number}
        </span>
        <span className="hidden @min-[34rem]/arrivals:inline" aria-hidden>
          Platform {number}
        </span>
      </>
    )}
  </span>
);
