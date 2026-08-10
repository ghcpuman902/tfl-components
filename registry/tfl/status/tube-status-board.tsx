import { type ReactNode } from "react";
import Link from "next/link";
import {
  getSeverityClasses,
  getLineCssProps,
  getLineInlineStyles,
  isNormalService,
  hasNightService,
} from "tfl-ts";
import { ExternalLink, Package, TrainFrontTunnel } from "lucide-react";
import { cn } from "@/lib/utils";
import { LineColorBar } from "@/components/tfl/brand/line-badge";
import { TfLRoundel } from "@/components/tfl/brand/tfl-roundel";
import { Skeleton } from "@/components/ui/skeleton";
import type { StatusLine } from "@/lib/tfl/status-types";

export type { StatusLine } from "@/lib/tfl/status-types";

type Props = {
  /** Normalised line status rows from `tfl-ts` (or fixtures). Missing/`undefined` renders empty. */
  data?: readonly StatusLine[];
  children?: ReactNode;
  /** When true, omit the page header (useful inside a layout that already has one). */
  hideHeader?: boolean;
};

/**
 * Full Underground + Elizabeth — common curated subset for demos / Blocks.
 * Fetch with `getCachedLineStatuses(DEFAULT_STATUS_LINE_IDS)` in the app layer.
 */
export const DEFAULT_STATUS_LINE_IDS = [
  "bakerloo",
  "central",
  "circle",
  "district",
  "elizabeth",
  "hammersmith-city",
  "jubilee",
  "metropolitan",
  "northern",
  "piccadilly",
  "victoria",
  "waterloo-city",
] as const;

const darkReadableTextClass = "tfl-dark-line-text";

const stripStatusReason = (reason: string, lineName?: string) =>
  reason
    .replace(new RegExp(`^${lineName?.toUpperCase()}( LINE)?: `, "i"), "")
    .replace(
      /^(Hammersmith and City Line: )|(London Overground: )|(Docklands Light Railway: )\s*/,
      "",
    );

/** Static board chrome — no status data required. */
export const TubeStatusBoardHeader = () => (
  <div className="flex flex-wrap items-center justify-between gap-2">
    <div className="flex items-center gap-3">
      <TfLRoundel className="size-10 lg:size-12" />
      <div>
        <h1 className="scroll-m-20 text-balance text-4xl font-extrabold lg:text-5xl">
          Live TfL Status
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Built with{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">tfl-ts</code> +
          open React components
        </p>
      </div>
    </div>
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href="https://www.npmjs.com/package/tfl-ts"
        className="flex items-center gap-1 text-blue-500 hover:underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        <Package className="size-4" aria-hidden />
        npm package
        <ExternalLink className="size-4" aria-hidden />
      </Link>
      <Link
        href="https://github.com/ghcpuman902/tfl-ts"
        className="flex items-center gap-1 text-blue-500 hover:underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        GitHub
        <ExternalLink className="size-4" aria-hidden />
      </Link>
    </div>
  </div>
);

type SkeletonProps = {
  lineCount?: number;
};

export const TubeStatusBoardSkeleton = ({
  lineCount = DEFAULT_STATUS_LINE_IDS.length,
}: SkeletonProps) => (
  <div className="flex w-full flex-col gap-6" aria-busy aria-label="Loading line status">
    <div>
      <h2 className="mb-4 text-xl font-semibold">Service Disruptions</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="flex flex-col gap-3 border border-border bg-muted p-4 dark:bg-card">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-[6px] w-full" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    </div>

    <div>
      <h2 className="mb-4 text-xl font-semibold">Good Service</h2>
      <div className="grid grid-cols-2 justify-items-stretch gap-4 md:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: lineCount }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col border border-border bg-muted p-3 dark:bg-card"
          >
            <Skeleton className="h-4 w-20" />
            <Skeleton className="mt-2 h-[6px] w-full" />
          </div>
        ))}
      </div>
    </div>

    <div className="border-t pt-4 text-center text-sm text-muted-foreground">
      <p className="text-balance">
        Data from Transport for London via{" "}
        <span className="text-blue-500">tfl-ts</span>. Pass normalised rows as{" "}
        <code className="text-xs">data</code>.
      </p>
    </div>
  </div>
);

/**
 * Data-aware status board — pass normalised `tfl-ts` line status rows as `data`.
 * Fetching belongs in the app / docs / Block layer (see `getCachedLineStatuses`).
 */
export const TubeStatusBoard = ({
  data,
  hideHeader = false,
  children,
}: Props) => {
  const lines = data ?? [];
  const disruptedLines = lines.filter(
    (line) => !isNormalService(line.lineStatuses ?? []),
  );
  const goodServiceLines = lines.filter((line) =>
    isNormalService(line.lineStatuses ?? []),
  );

  return (
    <div className="mt-4 flex w-full flex-col gap-6">
      {!hideHeader && <TubeStatusBoardHeader />}

      {disruptedLines.length > 0 && (
        <div>
          <h2 className="mb-4 text-xl font-semibold">Service Disruptions</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {disruptedLines.map((line) => {
              const lineStyles = getLineInlineStyles(line.id ?? "");
              const cssProps = getLineCssProps(line.id ?? "");

              return (
                <div
                  key={line.id ?? line.name}
                  className="flex flex-col gap-0 border border-border bg-muted p-4 dark:bg-card"
                >
                  <h3
                    className={cn("text-lg font-semibold", darkReadableTextClass)}
                    style={{ color: lineStyles.color, ...cssProps }}
                  >
                    {line.name}
                  </h3>
                  <LineColorBar
                    lineId={line.id}
                    modeName={line.modeName}
                    heightClass="h-[6px]"
                  />

                  {line.lineStatuses?.map((status, index) => {
                    const severityClasses = getSeverityClasses(
                      status.statusSeverity ?? 10,
                      true,
                    );

                    return (
                      <div key={index} className="mt-2">
                        <span
                          className={cn(
                            "mr-2 font-medium",
                            severityClasses.text,
                            severityClasses.animation,
                          )}
                        >
                          {status.statusSeverityDescription}
                        </span>
                        {status.reason && (
                          <span className="mt-1 block text-pretty text-sm text-foreground/80">
                            {stripStatusReason(status.reason, line.name)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-4 text-xl font-semibold">
          Good Service
          {disruptedLines.length > 0 && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({goodServiceLines.length} lines)
            </span>
          )}
        </h2>
        <div className="grid grid-cols-2 justify-items-stretch gap-4 md:grid-cols-3 lg:grid-cols-5">
          {goodServiceLines.map((line) => {
            const lineStyles = getLineInlineStyles(line.id ?? "");
            const cssProps = getLineCssProps(line.id ?? "");

            return (
              <div
                key={line.id ?? line.name}
                className="flex flex-col border border-border bg-muted p-3 transition-colors hover:bg-muted/80 dark:bg-card dark:hover:bg-accent/50"
              >
                <div className="flex items-start justify-between">
                  <h3
                    className={cn(
                      "text-sm leading-tight font-semibold",
                      darkReadableTextClass,
                    )}
                    style={{ color: lineStyles.color, ...cssProps }}
                  >
                    {line.name}
                  </h3>
                  {hasNightService(line.lineStatuses ?? []) && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <TrainFrontTunnel
                        className={cn("h-3 w-3", darkReadableTextClass)}
                        style={{ color: lineStyles.color, ...cssProps }}
                        aria-hidden
                      />
                      <span>
                        {
                          line.lineStatuses?.find(
                            (status) => status.statusSeverity === 20,
                          )?.statusSeverityDescription
                        }
                      </span>
                    </div>
                  )}
                </div>
                <div className="mt-2">
                  <LineColorBar
                    lineId={line.id}
                    modeName={line.modeName}
                    heightClass="h-[6px]"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t pt-4 text-center text-sm text-muted-foreground">
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
