import type { CSSProperties } from "react";
import { getLineAriaLabel } from "tfl-ts";
import { LineName } from "@/components/tfl/brand/line-name";
import { TFL_BLUE } from "@/lib/tfl/brand-colours";
import {
  getLineNameTiers,
  joinLineNames,
} from "@/lib/tfl/line-names";
import {
  resolveRouteTrackStyle,
  routeTrackRailCount,
  type RouteTrackStyle,
} from "@/lib/tfl/route-track";
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
   * Explicit brand colour when `lineId` is not in the token set.
   * Sets `--line-raw` inline.
   */
  color?: string;
  /**
   * Use diagram paint when it differs from mode identity
   * (Cable Car map red instead of purple).
   */
  diagram?: boolean;
  /**
   * `clip` (default) — paint the full name, let the parent clip.
   * `shrink` — step full → middle → short via `LineName` (chips may wrap).
   */
  fit?: "clip" | "shrink";
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
  diagram,
  fit = "clip",
}: LineBadgeProps) => {
  const label = name ?? getLineNameTiers(lineId).full;
  const ariaLabel =
    lineStatuses && lineStatuses.length > 0
      ? getLineAriaLabel(label, lineStatuses)
      : `${label} line`;
  const style = lineRawStyle(color);
  const paint =
    fit === "shrink" ? (
      <LineName lineId={lineId} name={name ?? label} wrap />
    ) : (
      label
    );

  if (variant === "text") {
    return (
      <span
        data-line={lineId}
        data-tfl-diagram={diagram ? "" : undefined}
        className={cn(
          "font-semibold text-[var(--line-color)]",
          fit === "shrink" && "inline-block w-full min-w-0",
          className,
        )}
        style={style}
        aria-label={ariaLabel}
      >
        {paint}
      </span>
    );
  }

  return (
    <span
      data-line={lineId}
      data-tfl-diagram={diagram ? "" : undefined}
      className={cn(
        "inline-flex items-center bg-[var(--line-color)] px-2 py-0.5 text-xs font-bold text-[var(--line-ink)] tabular-nums",
        fit === "shrink" && "w-full min-w-0 max-w-full",
        className,
      )}
      style={{ border: "var(--line-border, none)", ...style }}
      aria-label={ariaLabel}
      role="img"
    >
      {paint}
    </span>
  );
};

export type LineBadgeGroupAlign = "left" | "right" | "center";
/** `auto` = shrink-wrap label (side fill). `under` = full-width floating label. */
export type LineBadgeGroupStripes = "auto" | "under";
/**
 * `label` (default) — TfL blue plate over the colour stack.
 * `codes` — same-height stripe stack; 3-letter abbrs take turns (CSS).
 * Fixed `5ch` so it aligns with `BusNumberChip` and single-line code chips.
 */
export type LineBadgeGroupVariant = "label" | "codes";

export type LineBadgeGroupProps = {
  /** Line ids to paint as one shared-track label. Prefer ≤3. */
  lineIds: readonly string[];
  /** Optional per-id name overrides aligned with `lineIds`. */
  names?: readonly string[];
  className?: string;
  /**
   * `label` (default) — blue plate + shared name.
   * `codes` — stripe stack at chip height; one 3-letter abbr at a time
   * in a fixed `5ch` box.
   */
  variant?: LineBadgeGroupVariant;
  /**
   * Text alignment. Also inferred from `className` (`text-left` /
   * `text-right` / `text-center`) when omitted. Default `left`.
   */
  align?: LineBadgeGroupAlign;
  /**
   * `auto` (default) — shrink-wrap the TfL blue label so stripes fill the side.
   * `under` — full-width text on the stripe field, no blue plate.
   * Ignored when `variant` is `codes`.
   */
  stripes?: LineBadgeGroupStripes;
};

const parseAlignFromClassName = (
  className: string | undefined,
): LineBadgeGroupAlign | undefined => {
  if (!className) return undefined;
  if (/(?:^|\s)(?:text-center|justify-center)(?:\s|$)/.test(className)) {
    return "center";
  }
  if (/(?:^|\s)(?:text-right|justify-end)(?:\s|$)/.test(className)) {
    return "right";
  }
  if (/(?:^|\s)(?:text-left|justify-start)(?:\s|$)/.test(className)) {
    return "left";
  }
  return undefined;
};

/**
 * Shared-track chip — pure CSS.
 *
 * Full-bleed vertical colour stack behind. TfL blue label floats on top and
 * shrink-wraps (`w-fit`) so stripes fill the open side (left→right tip,
 * right→left tip; center→both). When the name would cover the chip, a thin
 * `0.25rem` tip stays on the open side(s). Abbreviation steps against the
 * plate budget. Ladder: full → middle → short (no wrap). When too narrow
 * for a plate, the blue fill drops so stripes show through.
 */
export const LineBadgeGroup = ({
  lineIds,
  names,
  className,
  variant = "label",
  align: alignProp,
  stripes = "auto",
}: LineBadgeGroupProps) => {
  const fullNames = lineIds.map((id, index) =>
    getLineNameTiers(id, names?.[index]).full,
  );
  const ariaLabel = joinLineNames(fullNames);
  const ids = lineIds.length > 0 ? lineIds : ["underground"];
  const align =
    alignProp ?? parseAlignFromClassName(className) ?? "left";
  const forceUnder = stripes === "under";
  const noPlate = stripes === "under";

  if (variant === "codes") {
    const shorts = ids.map((id, index) =>
      getLineNameTiers(id, names?.[index]).short,
    );
    const codeCount = Math.min(Math.max(shorts.length, 1), 3);

    return (
      <span
        className={cn(
          "tfl-line-codes relative inline-flex h-5 w-[5ch] shrink-0 items-center justify-center overflow-hidden text-xs font-bold tabular-nums",
          className,
        )}
        style={{ "--codes-count": codeCount } as CSSProperties}
        data-codes={codeCount}
        aria-label={ariaLabel}
        role="img"
      >
        <span className="absolute inset-0 flex flex-col" aria-hidden>
          {ids.map((id) => (
            <span
              key={id}
              data-line={id}
              className="min-h-0 min-w-0 flex-1 bg-[var(--line-color)]"
            />
          ))}
        </span>
        <span
          className="relative z-10 grid w-full justify-items-center leading-5 text-white"
          aria-hidden
        >
          {shorts.map((code, index) => (
            <span
              key={`${ids[index]}-${code}`}
              data-code={code}
              className="col-start-1 row-start-1 text-center leading-none [text-box:trim-both_cap_alphabetic]"
              style={{ "--code-index": index } as CSSProperties}
            >
              {code}
            </span>
          ))}
        </span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        // Chip size for the stripe-tip calc (`100cqi` below).
        "@container/chip relative inline-flex w-full min-w-0 max-w-full items-center overflow-hidden text-xs font-bold tabular-nums",
        className,
      )}
      aria-label={ariaLabel}
      role="img"
    >
      <span className="absolute inset-0 flex flex-col" aria-hidden>
        {ids.map((id) => (
          <span
            key={id}
            data-line={id}
            className="min-h-0 min-w-0 flex-1 bg-[var(--line-color)]"
          />
        ))}
      </span>

      {/* Full-width measure box — plate packs to the aligned edge. */}
      <span
        className={cn(
          "@container/line-name relative z-10 flex w-full min-w-0",
          align === "right" && "justify-end",
          align === "center" && "justify-center",
        )}
      >
        <span
          className={cn(
            "px-2 leading-5 text-white",
            // Cap long names so a tip of stripe stays on the open side(s).
            forceUnder
              ? "w-full bg-transparent"
              : "w-fit max-w-[calc(100cqi-0.25rem)] bg-[var(--line-group-plate)]",
            align === "center" && "text-center",
            align === "right" && "text-right",
            align === "left" && "text-left",
            !noPlate &&
              // Too tight for a plate — drop blue fill instead of wrapping.
              "@max-[10rem]/line-name:bg-transparent @max-[10rem]/line-name:px-1",
          )}
          style={
            noPlate
              ? undefined
              : ({ "--line-group-plate": TFL_BLUE } as CSSProperties)
          }
        >
          <LineName
            lineIds={lineIds}
            names={names}
            group
            establishContainer={false}
          />
        </span>
      </span>
    </span>
  );
};

const resolveColorBarTrackStyle = (
  lineId?: string,
  modeName?: string,
): RouteTrackStyle => {
  if (modeName === "cable-car") return "cable-car";
  if (modeName === "overground" || modeName === "elizabeth-line") {
    return "parallel";
  }
  if (lineId) return resolveRouteTrackStyle(lineId);
  return "solid";
};

/** Horizontal brand colour bar; Overground / Elizabeth / Cable Car get rail stacks. */
export const LineColorBar = ({
  lineId,
  modeName,
  heightClass = "h-[4px]",
  color,
  diagram,
}: {
  lineId?: string;
  modeName?: string;
  heightClass?: string;
  /** Explicit brand colour when `lineId` is not in the token set. */
  color?: string;
  /**
   * Use diagram paint when it differs from mode identity
   * (Cable Car map red instead of purple).
   */
  diagram?: boolean;
}) => {
  const rails = routeTrackRailCount(
    resolveColorBarTrackStyle(lineId, modeName),
  );
  const style = lineRawStyle(color);
  const dataLine = lineId || undefined;
  const bands: { key: string; fill: boolean }[] = [];
  for (let i = 0; i < rails; i += 1) {
    bands.push({ key: `rail-${i}`, fill: true });
    if (i < rails - 1) {
      bands.push({ key: `gap-${i}`, fill: false });
    }
  }

  return (
    <div
      data-line={dataLine}
      data-tfl-diagram={diagram ? "" : undefined}
      className={cn(
        rails === 1 ? "relative w-full" : "flex w-full flex-col",
        heightClass,
      )}
      style={style}
      aria-hidden
    >
      {rails === 1 ? (
        <div className="h-full w-full bg-[var(--line-color)]" />
      ) : (
        bands.map((band) => (
          <div
            key={band.key}
            className={cn(
              "min-h-0 w-full flex-1",
              band.fill && "bg-[var(--line-color)]",
            )}
          />
        ))
      )}
    </div>
  );
};
