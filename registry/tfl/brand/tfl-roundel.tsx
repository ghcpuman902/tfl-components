"use client";

import { useState, type ReactNode, type SVGProps } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { TFL_BLUE, UNDERGROUND_RING_RED } from "@/lib/tfl/brand-colours";
import { ROUNDEL_FONT_FAMILY } from "@/lib/tfl/brand-rules";
import {
  ROUNDEL_PRESETS,
  TFL_BRAND_LINKS,
  getRoundelLogoPath,
  type RoundelPreset,
} from "@/lib/tfl/roundel-presets";

/** Skeleton matching the roundel footprint — use in `loading.tsx` or Suspense. */
export const TfLRoundelSkeleton = ({ className }: { className?: string }) => (
  <Skeleton
    className={cn("size-10 shrink-0 rounded-full", className)}
    aria-hidden
  />
);

/** Skeleton for the roundel demo page. */
export const TfLRoundelBoardSkeleton = () => (
  <div className="w-full space-y-8" aria-busy aria-label="Loading roundel">
    <div className="space-y-2">
      <Skeleton className="h-9 w-48 max-w-full" />
      <Skeleton className="h-4 w-full max-w-2xl" />
    </div>
    <Skeleton className="h-48 w-full" />
    <div className="flex flex-wrap items-end gap-8 rounded-lg border border-border p-6">
      <TfLRoundelSkeleton className="size-24" />
      <div className="flex flex-wrap items-end gap-3">
        {["size-4", "size-5", "size-6", "size-8", "size-10", "size-12"].map(
          (size) => (
            <TfLRoundelSkeleton key={size} className={size} />
          ),
        )}
      </div>
    </div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 12 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  </div>
);

export {
  ROUNDEL_LOGO_PATHS,
  ROUNDEL_LOGO_SOURCES,
  ROUNDEL_PRESETS,
  TFL_BRAND_LINKS,
  type RoundelPreset,
} from "@/lib/tfl/roundel-presets";

export {
  TFL_BLUE,
  TFL_MODAL_COLOURS,
  UNDERGROUND_LINE_COLOURS,
  UNDERGROUND_RING_RED,
  getRoundelExclusion,
  isRoundelAboveMinSize,
  ROUNDEL_DO_NOT,
  ROUNDEL_EXCLUSION_RATIO,
  ROUNDEL_FONT_FAMILY,
  ROUNDEL_FONT_POLICY,
  ROUNDEL_MIN_WIDTH_MM,
  ROUNDEL_MIN_WIDTH_PX,
} from "@/lib/tfl/brand";

/** Wikimedia geometry: bar extends past the circle (≈615×500). */
const VIEW_W = 615.3;
const VIEW_H = 500;
const CX = 308.123;
const CY = 249.985;
const OUTER_R = 250;
const INNER_R = 161.3;
const BAR_Y = 199.5;
const BAR_H = 101.1;

const DEFAULT_RING = UNDERGROUND_RING_RED;
const DEFAULT_BAR = TFL_BLUE;
const DEFAULT_TEXT = "#FFFFFF";

export type TfLRoundelProps = Omit<
  SVGProps<SVGSVGElement>,
  "color" | "text"
> & {
  /**
   * Named mode preset (colours + default bar text).
   * Overridable with `text` / `ringColor` / `barColor`.
   */
  variant?: RoundelPreset;
  /** Bar label. Pass `""` to hide text. Defaults to the variant label or UNDERGROUND. */
  text?: string;
  /** Ring (circle) colour. */
  ringColor?: string;
  /** Horizontal bar colour. */
  barColor?: string;
  /** Bar text colour. */
  textColor?: string;
  /**
   * Monochrome shorthand — sets both ring and bar when the specific
   * colour props are omitted.
   */
  lineColor?: string;
  /**
   * When true with a `variant`, render the exact Wikimedia SVG artwork
   * from `/transit-logos` instead of the customisable mark.
   */
  artwork?: boolean;
  className?: string;
};

const isRoundelAllowed = (): boolean => {
  if (typeof process === "undefined") return false;
  // Only public/prefixed vars — plain ALLOW_TFL_ROUNDEL is server-only in
  // Next.js and causes a span (SSR) vs button (client) hydration mismatch.
  return (
    process.env.NEXT_PUBLIC_ALLOW_TFL_ROUNDEL === "true" ||
    process.env.VITE_ALLOW_TFL_ROUNDEL === "true"
  );
};

const isDevelopment = (): boolean =>
  process.env.NODE_ENV === "development";

/** Scale bar text to fit — longer strings get a smaller size. */
const fontSizeForText = (value: string): number => {
  const len = Math.max(value.trim().length, 1);
  const byWidth = (VIEW_W * 0.9) / (len * 0.62);
  const byHeight = BAR_H * 0.52;
  return Math.min(byHeight, Math.max(22, byWidth));
};

const resolveRoundelColors = ({
  variant,
  lineColor,
  ringColor,
  barColor,
  textColor,
  text,
}: Pick<
  TfLRoundelProps,
  "variant" | "lineColor" | "ringColor" | "barColor" | "textColor" | "text"
>) => {
  const preset = variant ? ROUNDEL_PRESETS[variant] : undefined;
  return {
    ring: ringColor ?? lineColor ?? preset?.ringColor ?? DEFAULT_RING,
    bar: barColor ?? lineColor ?? preset?.barColor ?? DEFAULT_BAR,
    ink: textColor ?? preset?.textColor ?? DEFAULT_TEXT,
    label:
      text !== undefined
        ? text
        : (preset?.text ?? ROUNDEL_PRESETS.underground.text),
    ariaLabel: preset?.label ?? "Transport for London",
    style: preset?.style ?? "standard",
  };
};

/** Shared outer box — keeps placeholder and official mark the same size. */
const ROUNDEL_FRAME_CLASS =
  "inline-flex size-10 shrink-0 items-center justify-center leading-none [&>svg]:block [&>svg]:size-full [&>img]:block [&>img]:size-full";

const RoundelFrame = ({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) => <span className={cn(ROUNDEL_FRAME_CLASS, className)}>{children}</span>;

const RoundelBarText = ({
  value,
  fill,
  fontSize,
}: {
  value: string;
  fill: string;
  fontSize: number;
}) => (
  <text
    x={CX}
    y={CY}
    fill={fill}
    fontSize={fontSize}
    fontWeight={400}
    fontFamily={ROUNDEL_FONT_FAMILY}
    letterSpacing={value.length > 10 ? 1 : value.length > 8 ? 1.5 : 3}
    textAnchor="middle"
    dominantBaseline="central"
  >
    {value.toUpperCase()}
  </text>
);

/**
 * Customisable roundel using Wikimedia proportions (even-odd ring + full bar).
 * Trademarked; only render when the env flag is set.
 * Supports Basic Elements styles: standard, outline (Cable Car), cycles.
 */
const OfficialRoundelSvg = ({
  variant,
  text,
  ringColor,
  barColor,
  textColor,
  lineColor,
  className,
  ...props
}: TfLRoundelProps) => {
  const colors = resolveRoundelColors({
    variant,
    lineColor,
    ringColor,
    barColor,
    textColor,
    text,
  });
  const trimmed = colors.label.trim();
  const fontSize = fontSizeForText(trimmed);
  const ringStroke = OUTER_R - INNER_R;
  const ringRadius = (OUTER_R + INNER_R) / 2;
  const outlineStroke = ringStroke * 0.35;

  return (
    <RoundelFrame className={className}>
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        role="img"
        aria-label={colors.ariaLabel}
        className="size-full"
        {...props}
      >
        {colors.style === "outline" ? (
          <>
            <circle
              cx={CX}
              cy={CY}
              r={OUTER_R - outlineStroke / 2}
              fill="none"
              stroke={colors.ring}
              strokeWidth={outlineStroke}
            />
            <rect
              x={outlineStroke / 2}
              y={BAR_Y + outlineStroke / 2}
              width={VIEW_W - outlineStroke}
              height={BAR_H - outlineStroke}
              fill="none"
              stroke={colors.bar}
              strokeWidth={outlineStroke}
            />
          </>
        ) : colors.style === "cycles" ? (
          <>
            <circle
              cx={CX}
              cy={CY}
              r={OUTER_R - outlineStroke / 2}
              fill="none"
              stroke={colors.ring}
              strokeWidth={outlineStroke}
            />
            <rect
              y={BAR_Y}
              width={VIEW_W}
              height={BAR_H}
              fill={colors.bar}
              stroke={colors.ring}
              strokeWidth={outlineStroke * 0.75}
            />
          </>
        ) : (
          <>
            <circle
              cx={CX}
              cy={CY}
              r={ringRadius}
              fill="none"
              stroke={colors.ring}
              strokeWidth={ringStroke}
            />
            <rect y={BAR_Y} width={VIEW_W} height={BAR_H} fill={colors.bar} />
          </>
        )}
        {trimmed ? (
          <RoundelBarText
            value={trimmed}
            fill={colors.ink}
            fontSize={fontSize}
          />
        ) : null}
      </svg>
    </RoundelFrame>
  );
};

/** Exact Wikimedia artwork from `/public/transit-logos`. */
const RoundelArtwork = ({
  variant,
  className,
}: {
  variant: RoundelPreset;
  className?: string;
}) => {
  const preset = ROUNDEL_PRESETS[variant];
  const logoPath = getRoundelLogoPath(variant);
  if (!logoPath) {
    return (
      <OfficialRoundelSvg variant={variant} className={className} />
    );
  }

  return (
    <RoundelFrame className={className}>
      {/* Static SVG logos — next/image adds little and breaks portable registry installs. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoPath}
        alt={preset.label}
        className="size-full object-contain"
      />
    </RoundelFrame>
  );
};

/**
 * Placeholder: same footprint, but a filled disc + rounded bar so it is
 * clearly not the trademarked hollow ring. Still honours text / colours /
 * variants so demos stay useful without the env flag.
 */
const PlaceholderRoundelSvg = ({
  variant,
  text,
  ringColor,
  barColor,
  textColor,
  lineColor,
  className,
  framed = true,
  ...props
}: TfLRoundelProps & { framed?: boolean }) => {
  const preset = variant ? ROUNDEL_PRESETS[variant] : undefined;
  const hasColour = Boolean(ringColor ?? barColor ?? lineColor ?? preset);
  const disc = ringColor ?? lineColor ?? preset?.ringColor;
  const bar = barColor ?? lineColor ?? preset?.barColor;
  const ink =
    textColor ??
    preset?.textColor ??
    (hasColour ? DEFAULT_TEXT : undefined);
  const label = text !== undefined ? text : (preset?.text ?? "");
  const trimmed = label.trim();
  const fontSize = fontSizeForText(trimmed || "X");

  const svg = (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      role="img"
      aria-label={
        preset?.label
          ? `${preset.label} (placeholder)`
          : "TfL roundel placeholder"
      }
      className={cn(
        framed ? "size-full" : "size-10 shrink-0",
        !hasColour && "text-muted-foreground",
        !framed && className,
      )}
      {...props}
    >
      {/* Solid disc — not a hollow ring (licensed mark uses a ring). */}
      <circle
        cx={CX}
        cy={CY}
        r={OUTER_R}
        fill={disc ?? "currentColor"}
        opacity={hasColour ? 1 : 0.22}
      />
      {/* Rounded bar — licensed mark uses a sharp full-width rect. */}
      <rect
        x={VIEW_W * 0.04}
        y={BAR_Y + 6}
        width={VIEW_W * 0.92}
        height={BAR_H - 12}
        rx={BAR_H / 2}
        ry={BAR_H / 2}
        fill={bar ?? "currentColor"}
        opacity={hasColour ? 1 : 0.75}
      />
      {trimmed ? (
        <text
          x={CX}
          y={CY}
          fill={ink ?? "currentColor"}
          fontSize={fontSize}
          fontWeight={400}
          fontFamily={ROUNDEL_FONT_FAMILY}
          letterSpacing={trimmed.length > 10 ? 1 : trimmed.length > 8 ? 1.5 : 3}
          textAnchor="middle"
          dominantBaseline="central"
          opacity={hasColour ? 1 : 0.9}
        >
          {trimmed.toUpperCase()}
        </text>
      ) : null}
    </svg>
  );

  if (!framed) return svg;

  return <RoundelFrame className={className}>{svg}</RoundelFrame>;
};

const RoundelTrademarkModal = ({
  className,
  ...props
}: TfLRoundelProps) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger
            className={cn(
              ROUNDEL_FRAME_CLASS,
              "cursor-help opacity-70 transition-opacity hover:opacity-100",
              className,
            )}
            // span (not button) so this stays valid inside links / other controls
            render={
              <span
                role="button"
                tabIndex={0}
                aria-label="TfL roundel placeholder — trademark notice"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setOpen(true);
                }}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  event.stopPropagation();
                  setOpen(true);
                }}
              />
            }
          >
            <PlaceholderRoundelSvg
              {...props}
              framed={false}
              className="size-full"
            />
          </TooltipTrigger>
          <TooltipContent
            side="bottom"
            className="max-w-[14rem] border border-border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md"
          >
            Trademark placeholder. Click for details.
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Trademark placeholder</DialogTitle>
            <DialogDescription>
              The TfL roundel is a registered trademark. This library ships a
              filled, rounded stand-in by default so demos stay safe.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              Opting in with{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground">
                NEXT_PUBLIC_ALLOW_TFL_ROUNDEL=true
              </code>{" "}
              means <em className="text-foreground">your</em> app accepts
              trademark responsibility for showing the real mark.
            </p>
            <p>
              For licensing, logo requests, and design rules, use TfL&apos;s
              own brand guidance — not this package.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <DialogClose render={<Button variant="outline" />}>
              Close
            </DialogClose>
            <a
              href={TFL_BRAND_LINKS.usingBrandIp}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants())}
            >
              TfL brand IP guide
            </a>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

/**
 * Env-gated TfL roundel.
 *
 * Set `NEXT_PUBLIC_ALLOW_TFL_ROUNDEL=true` (or `VITE_ALLOW_TFL_ROUNDEL` in
 * Vite) in your app to render the official mark. Doing so shifts trademark
 * responsibility to your application — this component is only a delivery
 * vehicle. Use a public-prefixed env var so SSR and the client agree.
 *
 * Without the flag, a filled-disc + rounded-bar placeholder of the same size
 * is shown (still respects `text` / colours / variants). In development only,
 * hover/click opens a short trademark notice.
 *
 * @example
 * ```tsx
 * <TfLRoundel className="size-8" />
 * <TfLRoundel text="MY APP" ringColor="#E32017" barColor="#0019A8" />
 * <TfLRoundel variant="elizabeth" />
 * <TfLRoundel variant="overground" artwork />
 * ```
 */
export const TfLRoundel = ({
  variant,
  text,
  ringColor,
  barColor,
  textColor,
  lineColor,
  artwork = false,
  className,
  ...props
}: TfLRoundelProps) => {
  const shared = {
    variant,
    text,
    ringColor,
    barColor,
    textColor,
    lineColor,
    className,
    ...props,
  };

  if (isRoundelAllowed()) {
    if (artwork && variant) {
      return <RoundelArtwork variant={variant} className={className} />;
    }

    return <OfficialRoundelSvg {...shared} />;
  }

  if (isDevelopment()) {
    return <RoundelTrademarkModal {...shared} />;
  }

  return <PlaceholderRoundelSvg {...shared} />;
};
