import type { CSSProperties } from "react";
import { getLineAriaLabel } from "tfl-ts";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

type LineStatusLike = {
  statusSeverity?: number;
  statusSeverityDescription?: string;
};

type LineBadgeProps = {
  lineId: string;
  name?: string;
  lineStatuses?: LineStatusLike[];
  className?: string;
  /** Show a filled colour chip (default) or text-only with brand colour. */
  variant?: "chip" | "text";
  /**
   * Explicit brand colour when `lineId` is not in the token set
   * (e.g. Cable Car map red). Sets `--line-raw` inline.
   */
  color?: string;
};

/** Optional `--line-raw` override for lines outside the token palette. */
const lineRawStyle = (color?: string): CSSProperties | undefined =>
  color ? ({ "--line-raw": color } as CSSProperties) : undefined;

/** Skeleton for a line badge chip — use in `loading.tsx` or Suspense. */
export const LineBadgeSkeleton = ({ className }: { className?: string }) => (
  <Skeleton
    className={cn("inline-flex h-5 w-16", className)}
    aria-hidden
  />
);

/** Skeleton grid matching the line badge demo page. */
export const LineBadgeBoardSkeleton = () => (
  <div className="w-full space-y-8" aria-busy aria-label="Loading line badges">
    <div className="space-y-2">
      <Skeleton className="h-9 w-40 max-w-full" />
      <Skeleton className="h-4 w-full max-w-lg" />
    </div>
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: 12 }).map((_, i) => (
        <LineBadgeSkeleton key={i} />
      ))}
    </div>
    <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  </div>
);

/**
 * Official TfL line colour badge.
 * Colours resolve via `data-line` → `--line-color` / `--line-ink` from tfl-colours.
 * Northern dark mode uses a white fill token (no shadow outline).
 */
export const LineBadge = ({
  lineId,
  name,
  lineStatuses,
  className,
  variant = "chip",
  color,
}: LineBadgeProps) => {
  const label = name ?? lineId;
  const ariaLabel =
    lineStatuses && lineStatuses.length > 0
      ? getLineAriaLabel(label, lineStatuses)
      : `${label} line`;
  const style = lineRawStyle(color);

  if (variant === "text") {
    return (
      <span
        data-line={lineId}
        className={cn("font-semibold text-[var(--line-color)]", className)}
        style={style}
        aria-label={ariaLabel}
      >
        {label}
      </span>
    );
  }

  return (
    <span
      data-line={lineId}
      className={cn(
        "inline-flex items-center bg-[var(--line-color)] px-2 py-0.5 text-xs font-bold text-[var(--line-ink)] tabular-nums",
        className,
      )}
      style={{ border: "var(--line-border, none)", ...style }}
      aria-label={ariaLabel}
      role="img"
    >
      {label}
    </span>
  );
};

/** Horizontal brand colour bar; Overground / Elizabeth / Cable Car get rail stacks. */
export const LineColorBar = ({
  lineId,
  modeName,
  heightClass = "h-[4px]",
  color,
}: {
  lineId?: string;
  modeName?: string;
  heightClass?: string;
  /** Explicit brand colour when `lineId` is not in the token set. */
  color?: string;
}) => {
  const isParallel =
    modeName === "overground" || modeName === "elizabeth-line";
  /** Map diagram: three red rails + two white gaps (not mode purple). */
  const isCableCar = modeName === "cable-car";
  const railClass = "w-full bg-[var(--line-color)]";
  const style = lineRawStyle(color);
  const dataLine = lineId || undefined;

  if (isCableCar) {
    return (
      <div
        data-line={dataLine}
        className={cn("grid w-full grid-rows-5", heightClass)}
        style={style}
        aria-hidden
      >
        <div className={railClass} />
        <div />
        <div className={railClass} />
        <div />
        <div className={railClass} />
      </div>
    );
  }

  // Parallel mark: equal stroke / gap / stroke (brand §5), gap shows parent surface.
  if (isParallel) {
    return (
      <div
        data-line={dataLine}
        className={cn("grid w-full grid-rows-3", heightClass)}
        style={style}
        aria-hidden
      >
        <div className={railClass} />
        <div />
        <div className={railClass} />
      </div>
    );
  }

  return (
    <div
      data-line={dataLine}
      className={cn("relative w-full", heightClass)}
      style={style}
      aria-hidden
    >
      <div className={cn("h-full", railClass)} />
    </div>
  );
};
