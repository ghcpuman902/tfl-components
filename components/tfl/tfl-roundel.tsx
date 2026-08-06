"use client";

import type { SVGProps } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type TfLRoundelProps = SVGProps<SVGSVGElement> & {
  /** Override fill/stroke colour (default TfL corporate blue). */
  lineColor?: string;
  className?: string;
};

const isRoundelAllowed = (): boolean => {
  if (typeof process === "undefined") return false;
  return (
    process.env.NEXT_PUBLIC_ALLOW_TFL_ROUNDEL === "true" ||
    process.env.VITE_ALLOW_TFL_ROUNDEL === "true" ||
    process.env.ALLOW_TFL_ROUNDEL === "true"
  );
};

/** Classic TfL roundel silhouette: ring + horizontal bar. Trademarked; only render when opted in. */
const OfficialRoundelSvg = ({
  lineColor = "#003688",
  className,
  ...props
}: TfLRoundelProps) => (
  <svg
    viewBox="0 0 100 100"
    role="img"
    aria-label="Transport for London"
    className={cn("size-10 shrink-0", className)}
    {...props}
  >
    <circle
      cx="50"
      cy="50"
      r="35"
      fill="none"
      stroke={lineColor}
      strokeWidth="12"
    />
    <rect x="5" y="41" width="90" height="18" fill={lineColor} />
  </svg>
);

/**
 * Placeholder: same footprint as the official mark, but the disc is filled
 * and the bar has rounded caps so it is clearly not the trademarked roundel.
 */
const PlaceholderRoundelSvg = ({
  className,
  ...props
}: TfLRoundelProps) => (
  <svg
    viewBox="0 0 100 100"
    role="img"
    aria-label="TfL roundel placeholder"
    className={cn("size-10 shrink-0 text-muted-foreground", className)}
    {...props}
  >
    {/* Filled disc — not a hollow ring */}
    <circle cx="50" cy="50" r="40" fill="currentColor" opacity="0.18" />
    <circle
      cx="50"
      cy="50"
      r="34"
      fill="none"
      stroke="currentColor"
      strokeWidth="8"
      opacity="0.55"
    />
    {/* Rounded bar through the middle */}
    <rect
      x="8"
      y="42"
      width="84"
      height="16"
      rx="8"
      ry="8"
      fill="currentColor"
      opacity="0.75"
    />
  </svg>
);

/**
 * Env-gated TfL roundel.
 *
 * Set `NEXT_PUBLIC_ALLOW_TFL_ROUNDEL=true` (or `VITE_ALLOW_TFL_ROUNDEL` /
 * `ALLOW_TFL_ROUNDEL`) in your app to render the official mark. Doing so
 * shifts trademark responsibility to your application — this component is
 * only a delivery vehicle.
 *
 * Without the flag, a filled/rounded placeholder of the same size is shown,
 * with a tooltip explaining how to enable the real mark.
 */
export const TfLRoundel = ({
  lineColor = "#003688",
  className,
  ...props
}: TfLRoundelProps) => {
  if (isRoundelAllowed()) {
    return (
      <OfficialRoundelSvg
        lineColor={lineColor}
        className={className}
        {...props}
      />
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          className={cn(
            "inline-flex cursor-help opacity-70 transition-opacity hover:opacity-100",
            className,
          )}
          render={
            <button
              type="button"
              aria-label="TfL roundel placeholder — trademark notice"
            />
          }
        >
          <PlaceholderRoundelSvg {...props} />
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          className="max-w-xs border border-border bg-popover p-3 text-xs text-popover-foreground shadow-md"
        >
          <p className="mb-1 font-semibold text-destructive">
            Trademark placeholder
          </p>
          <p>
            The official TfL roundel is a registered trademark. This library
            ships a filled, rounded stand-in by default.
          </p>
          <p className="mt-2 rounded bg-muted p-1.5 font-mono text-[10px] leading-snug text-foreground">
            NEXT_PUBLIC_ALLOW_TFL_ROUNDEL=true
          </p>
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            Setting the flag in your app means you accept trademark
            responsibility for displaying the real mark.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
