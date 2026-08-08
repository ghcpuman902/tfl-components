import {
  getLineAriaLabel,
  getLineCssProps,
  getLineInlineStyles,
} from "tfl-ts";
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
};

/** Skeleton for a line badge chip — use in `loading.tsx` or Suspense. */
export const LineBadgeSkeleton = ({ className }: { className?: string }) => (
  <Skeleton
    className={cn("inline-flex h-5 w-16 rounded-md", className)}
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
      {Array.from({ length: 8 }).map((_, i) => (
        <LineBadgeSkeleton key={i} />
      ))}
    </div>
    <div className="grid gap-3 sm:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  </div>
);

/**
 * Official TfL line colour badge.
 * Poor-contrast lines (Northern) keep brand fill on dark surfaces with a hard
 * white outline via `--line-dark-box-shadow` / `--line-dark-text-shadow`.
 */
export const LineBadge = ({
  lineId,
  name,
  lineStatuses,
  className,
  variant = "chip",
}: LineBadgeProps) => {
  const styles = getLineInlineStyles(lineId);
  const cssProps = getLineCssProps(lineId);
  const label = name ?? lineId;
  const ariaLabel =
    lineStatuses && lineStatuses.length > 0
      ? getLineAriaLabel(label, lineStatuses)
      : `${label} line`;

  if (variant === "text") {
    return (
      <span
        className={cn(
          "font-semibold dark:[text-shadow:var(--line-dark-text-shadow)]",
          className,
        )}
        style={{ color: styles.color, ...cssProps }}
        aria-label={ariaLabel}
      >
        {label}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md bg-[var(--line-color)] px-2 py-0.5 text-xs font-bold text-white tabular-nums dark:[box-shadow:var(--line-dark-box-shadow)]",
        className,
      )}
      style={cssProps}
      aria-label={ariaLabel}
      role="img"
    >
      {label}
    </span>
  );
};

/** Horizontal brand colour bar; Overground / Elizabeth get equal parallel rails. */
export const LineColorBar = ({
  lineId,
  modeName,
  heightClass = "h-[4px]",
}: {
  lineId?: string;
  modeName?: string;
  heightClass?: string;
}) => {
  const hasStripe = modeName === "overground" || modeName === "elizabeth-line";
  const railClass =
    "w-full bg-[var(--line-color)] dark:[box-shadow:var(--line-dark-box-shadow)]";
  const cssProps = getLineCssProps(lineId ?? "");

  // Parallel mark: equal stroke / gap / stroke (brand §5), gap shows parent surface.
  if (hasStripe) {
    return (
      <div
        className={cn("grid w-full grid-rows-3", heightClass)}
        style={cssProps}
        aria-hidden
      >
        <div className={railClass} />
        <div />
        <div className={railClass} />
      </div>
    );
  }

  return (
    <div className={cn("relative w-full", heightClass)} style={cssProps} aria-hidden>
      <div className={cn("h-full", railClass)} />
    </div>
  );
};
