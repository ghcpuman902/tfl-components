import { type ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { TfLRoundel } from "@/components/tfl/brand/tfl-roundel";
import { Skeleton } from "@/components/ui/skeleton";
import type { CycleHireDock } from "@/lib/tfl/cycle-hire-types";
import { getDockCounts } from "@/components/tfl/cycle-hire/cycle-hire-dock-marker";
import {
  cycleHireBikeFillClass,
  cycleHireBikeTextClass,
  cycleHireBrokenFillClass,
  cycleHireBrokenTextClass,
  cycleHireEbikeFillClass,
  cycleHireEbikeTextClass,
} from "@/components/tfl/cycle-hire/cycle-hire-colours";

export const DEFAULT_CYCLE_HIRE_DOCK_IDS = [
  "BikePoints_237",
  "BikePoints_490",
  "BikePoints_46",
] as const;

/** One arrivals tile. Heights stay rem literals so the row does not inherit board vars. */
const DOCK_ROW_HEIGHT_CLASS =
  "box-border h-[3rem] min-h-[3rem] max-h-[3rem] overflow-clip";
const DOCK_ROW_TRACK_CLASS =
  "grid grid-rows-[0.875rem_1.125rem_0.75rem] gap-0.5";

type SlotKind = "standard" | "eBike" | "empty" | "broken";

/** One cell per dock slot so `gap-*` reads between every slot, not only kind changes. */
const buildOccupancySlots = (
  counts: ReturnType<typeof getDockCounts>,
  showBroken: boolean,
): SlotKind[] => {
  const { standardBikes, eBikes, emptyDocks, brokenDocks } = counts;
  const slots: SlotKind[] = [];
  for (let i = 0; i < standardBikes; i += 1) slots.push("standard");
  for (let i = 0; i < eBikes; i += 1) slots.push("eBike");
  for (let i = 0; i < emptyDocks; i += 1) slots.push("empty");
  if (showBroken) {
    for (let i = 0; i < brokenDocks; i += 1) slots.push("broken");
  }
  return slots;
};

const slotFillClass = (kind: SlotKind) => {
  if (kind === "standard") return cycleHireBikeFillClass;
  if (kind === "eBike") return cycleHireEbikeFillClass;
  if (kind === "broken") return cycleHireBrokenFillClass;
  if (kind === "empty") return "bg-muted-foreground/25";
  return undefined;
};

export const CycleHireDocksBoardHeader = () => (
  <div className="flex flex-wrap items-center justify-between gap-2">
    <div className="flex items-center gap-3">
      <TfLRoundel variant="cycles" className="size-10 lg:size-12" />
      <div>
        <h1 className="scroll-m-20 text-balance text-4xl font-extrabold lg:text-5xl">
          Cycle hire docks
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Santander Cycles availability via{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">tfl-ts</code>
        </p>
      </div>
    </div>
  </div>
);

type SkeletonProps = {
  dockCount?: number;
};

export const CycleHireDocksBoardSkeleton = ({
  dockCount = DEFAULT_CYCLE_HIRE_DOCK_IDS.length,
}: SkeletonProps) => (
  <div
    className="flex w-full flex-col gap-6"
    aria-busy
    aria-label="Loading cycle hire docks"
  >
    {Array.from({ length: dockCount }).map((_, i) => (
      <div
        key={i}
        className={cn(DOCK_ROW_HEIGHT_CLASS, DOCK_ROW_TRACK_CLASS)}
      >
        <Skeleton className="h-full w-48 max-w-full" />
        <Skeleton className="h-full w-full" />
        <Skeleton className="h-full w-40" />
      </div>
    ))}
  </div>
);

type DockRowProps = {
  dock: CycleHireDock;
  className?: string;
  showBroken?: boolean;
};

export const CycleHireDockRow = ({
  dock,
  className,
  showBroken = false,
}: DockRowProps) => {
  const counts = getDockCounts(dock);
  const { eBikes, standardBikes, brokenDocks, emptyDocks, totalDocks } =
    counts;

  if (totalDocks === 0) {
    return (
      <div
        className={cn(
          DOCK_ROW_HEIGHT_CLASS,
          "flex flex-col justify-center gap-0.5",
          className,
        )}
      >
        <h3 className="truncate text-sm leading-none font-semibold text-foreground">
          {dock.name}
        </h3>
        <p className="text-xs leading-none text-muted-foreground">
          No docks reported
        </p>
      </div>
    );
  }

  const slots = buildOccupancySlots(counts, showBroken);
  const showBrokenCount = showBroken && brokenDocks > 0;

  const ariaParts = [
    `${standardBikes} bikes`,
    `${eBikes} e-bikes`,
    `${emptyDocks} spaces`,
    showBrokenCount ? `${brokenDocks} broken` : null,
  ].filter(Boolean);

  return (
    <div
      className={cn(DOCK_ROW_HEIGHT_CLASS, DOCK_ROW_TRACK_CLASS, className)}
    >
      <div className="flex min-w-0 items-center justify-between gap-x-3">
        <h3 className="min-w-0 truncate text-sm leading-none font-semibold text-foreground">
          {dock.name}
        </h3>
        <div className="flex shrink-0 items-center gap-2 text-xs leading-none text-muted-foreground">
          {dock.isLocked ? (
            <span className="font-medium text-destructive">Locked</span>
          ) : null}
          {dock.isTemporary ? (
            <span className="font-medium text-sky-600 dark:text-sky-400">
              Temporary
            </span>
          ) : null}
        </div>
      </div>

      <div
        className="flex h-full w-full gap-0.5"
        role="img"
        aria-label={`${dock.name}: ${ariaParts.join(", ")}`}
      >
        {slots.map((kind, index) => (
          <div
            key={`${dock.id}-${kind}-${index}`}
            className={cn("min-w-0 flex-1", slotFillClass(kind))}
          />
        ))}
      </div>

      <div className="flex items-center justify-between gap-4 text-xs leading-none font-medium tracking-wide uppercase">
        <div className="flex min-w-0 items-center gap-x-3 overflow-clip">
          {standardBikes > 0 ? (
            <span className={cn("whitespace-nowrap", cycleHireBikeTextClass)}>
              {standardBikes} bikes
            </span>
          ) : null}
          {eBikes > 0 ? (
            <span className={cn("whitespace-nowrap", cycleHireEbikeTextClass)}>
              {eBikes} ebikes
            </span>
          ) : null}
          {showBrokenCount ? (
            <span className={cn("whitespace-nowrap", cycleHireBrokenTextClass)}>
              {brokenDocks} broken
            </span>
          ) : null}
          {standardBikes === 0 && eBikes === 0 && !showBrokenCount ? (
            <span className="text-muted-foreground normal-case tracking-normal">
              No bikes
            </span>
          ) : null}
        </div>
        <span className="shrink-0 text-muted-foreground">
          {emptyDocks} spaces
        </span>
      </div>
    </div>
  );
};

type DetailProps = {
  /** Normalised bike points. Omit when rendered under `CycleHireDocks` / Provider. */
  data?: readonly CycleHireDock[];
  children?: ReactNode;
  hideHeader?: boolean;
  statusLabel?: string;
  showBroken?: boolean;
  className?: string;
};

/**
 * Detail surface — occupancy bars + TfL-style counts.
 * Pass `data` explicitly, or nest under `CycleHireDocks` / Provider.
 * Wrap in Sheet / card chrome in the app if needed.
 */
export const CycleHireDocksDetail = ({
  data,
  hideHeader = false,
  statusLabel,
  showBroken = false,
  className,
  children,
}: DetailProps) => {
  const docks = data ?? [];

  return (
    <div className={cn("flex w-full flex-col gap-6", className)}>
      {!hideHeader && <CycleHireDocksBoardHeader />}

      {statusLabel ? (
        <p className="text-xs text-muted-foreground">{statusLabel}</p>
      ) : null}

      {docks.length === 0 ? (
        <p className="text-sm text-muted-foreground">No docks to show.</p>
      ) : (
        <div className="flex flex-col gap-5">
          {docks.map((dock) => (
            <CycleHireDockRow
              key={dock.id}
              dock={dock}
              showBroken={showBroken}
            />
          ))}
        </div>
      )}

      <div className="text-center text-sm text-muted-foreground">
        <p className="text-balance">
          Data from Transport for London via{" "}
          <Link
            href="https://www.npmjs.com/package/tfl-ts"
            className="text-blue-500 hover:underline"
          >
            tfl-ts
          </Link>
          . Pass normalised rows as <code className="text-xs">data</code>.
        </p>
      </div>

      {children}
    </div>
  );
};

/** @deprecated Prefer `CycleHireDocksDetail`. */
export const CycleHireDocksBoard = CycleHireDocksDetail;
