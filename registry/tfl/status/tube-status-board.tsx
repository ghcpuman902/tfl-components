import { type ReactNode, Suspense } from "react";
import Link from "next/link";
import { cacheLife, cacheTag } from "next/cache";
import {
  sortLinesBySeverityAndOrder,
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
import { getTflClient } from "@/lib/tfl/client";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  children?: ReactNode;
  /** When true, omit the page header (useful inside a layout that already has one). */
  hideHeader?: boolean;
  /**
   * Fetch status for these line IDs in one request.
   * When omitted, loads all tube / Elizabeth / DLR / tram / Overground modes.
   */
  lineIds?: readonly string[];
}

/** Curated set used by apps that only care about core Underground + Elizabeth. */
export const DEFAULT_STATUS_LINE_IDS = [
  "central",
  "northern",
  "victoria",
  "jubilee",
  "elizabeth",
  "bakerloo",
  "piccadilly",
  "district",
] as const;

const darkReadableTextClass = "tfl-dark-line-text";

const stripStatusReason = (reason: string, lineName?: string) =>
  reason
    .replace(new RegExp(`^${lineName?.toUpperCase()}( LINE)?: `, "i"), "")
    .replace(
      /^(Hammersmith and City Line: )|(London Overground: )|(Docklands Light Railway: )\s*/,
      "",
    );

async function getCachedLineStatuses(lineIds?: readonly string[]) {
  "use cache";
  cacheLife({ revalidate: 60 });
  cacheTag("tfl-line-status");

  const client = getTflClient();
  const lineStatuses = await client.line.getStatus(
    lineIds && lineIds.length > 0
      ? { lineIds: [...lineIds] }
      : {
          modes: ["tube", "elizabeth-line", "dlr", "tram", "overground"],
        },
  );
  return sortLinesBySeverityAndOrder(lineStatuses);
}

async function TubeStatusBoardBody({
  children,
  hideHeader = false,
  lineIds,
}: Props) {
  const sortedLineStatuses = await getCachedLineStatuses(lineIds);
  const disruptedLines = sortedLineStatuses.filter(
    (line) => !isNormalService(line.lineStatuses ?? []),
  );
  const goodServiceLines = sortedLineStatuses.filter((line) =>
    isNormalService(line.lineStatuses ?? []),
  );

  return (
    <div className="mt-4 flex w-full flex-col gap-6">
      {!hideHeader && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <TfLRoundel className="size-10 lg:size-12" />
            <div>
              <h1 className="scroll-m-20 text-balance text-4xl font-extrabold tracking-tight lg:text-5xl">
                Live TfL Status
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Built with{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">
                  tfl-ts
                </code>{" "}
                + open React components
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
      )}

      {disruptedLines.length > 0 && (
        <div>
          <h2 className="mb-4 text-xl font-semibold">Service Disruptions</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {disruptedLines.map((line) => {
              const lineStyles = getLineInlineStyles(line.id ?? "");
              const cssProps = getLineCssProps(line.id ?? "");

              return (
                <div
                  key={line.id}
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
                key={line.id}
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
          . Cached ~60s via Next.js Cache Components.
        </p>
      </div>

      {children}
    </div>
  );
}

/** Skeleton for the tube status board — use in `loading.tsx` or Suspense. */
export const TubeStatusBoardSkeleton = () => (
  <div className="mt-4 w-full space-y-6" aria-busy aria-label="Loading line status">
    <div className="flex items-center gap-3">
      <Skeleton className="size-10 rounded-full lg:size-12" />
      <div className="space-y-2">
        <Skeleton className="h-9 w-64 max-w-full" />
        <Skeleton className="h-4 w-48 max-w-full" />
      </div>
    </div>
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
      {Array.from({ length: 10 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  </div>
);

/** Live tube/rail status board. Status fetch is cached ~60s (`use cache`). */
export function TubeStatusBoard(props: Props) {
  return (
    <Suspense fallback={<TubeStatusBoardSkeleton />}>
      <TubeStatusBoardBody {...props} />
    </Suspense>
  );
}
