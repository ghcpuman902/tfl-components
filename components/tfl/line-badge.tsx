import {
  getLineAriaLabel,
  getLineCssProps,
  getLineDarkReadableStyles,
  getLineInlineStyles,
} from "tfl-ts";
import { cn } from "@/lib/utils";

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

/**
 * Official TfL line colour badge.
 * Northern stays black in dark mode — contrast comes from the hard outline ring,
 * not a white fill invert.
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
  const darkReadable = getLineDarkReadableStyles(lineId);
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
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold tabular-nums text-white",
        className,
      )}
      style={{
        backgroundColor: styles.backgroundColor,
        color: "#ffffff",
        ...cssProps,
        ...(darkReadable?.boxShadow ? { boxShadow: darkReadable.boxShadow } : {}),
      }}
      aria-label={ariaLabel}
      role="img"
    >
      {label}
    </span>
  );
};

/** Horizontal brand colour bar; Overground / Elizabeth get a white centre stripe. */
export const LineColorBar = ({
  lineId,
  modeName,
  heightClass = "h-[4px]",
}: {
  lineId?: string;
  modeName?: string;
  heightClass?: string;
}) => {
  const stripeOffset = heightClass.includes("6px") ? "top-[2px]" : "top-[1px]";
  const hasStripe = modeName === "overground" || modeName === "elizabeth-line";

  return (
    <div
      className={cn("relative w-full", heightClass)}
      style={getLineCssProps(lineId ?? "")}
    >
      <div className="h-full w-full bg-[var(--line-color)] dark:[box-shadow:var(--line-dark-box-shadow)]" />
      {hasStripe && (
        <div
          className={cn("absolute left-0 h-[2px] w-full bg-white", stripeOffset)}
        />
      )}
    </div>
  );
};
