"use client";

import { Suspense, use, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { getSeverityClasses, isNormalService } from "tfl-ts";
import { LineColorBar } from "@/components/tfl/brand/line-badge";
import {
  CodeSnippet,
  CopyableField,
  EntityInspectorShell,
  InspectorJson,
  InspectorSection,
} from "@/components/explorer/entity-inspector/entity-inspector";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useExplorerKeyedQuery } from "@/hooks/use-explorer-keyed-query";
import { buildExplorerHref, type ExplorerDirection } from "@/lib/tfl/explorer-url-state";
import type {
  ExplorerLineDetailsPayload,
  ExplorerLineSummary,
} from "@/lib/tfl/explorer/common";
import type { StatusLine } from "@/lib/tfl/status-types";
import { cn } from "@/lib/utils";

type LineInspectorProps = {
  line: ExplorerLineSummary;
  direction: ExplorerDirection;
  domain: "tube-rail" | "bus";
  detailsPromise?: Promise<ExplorerLineDetailsPayload> | null;
  detailsPending?: boolean;
  onDirectionChange?: (direction: ExplorerDirection) => void;
};

const LineDirectionToggle = ({
  lineId,
  direction,
  domain,
  onDirectionChange,
}: {
  lineId: string;
  direction: ExplorerDirection;
  domain: "tube-rail" | "bus";
  onDirectionChange?: (direction: ExplorerDirection) => void;
}) => {
  const inboundHref = buildExplorerHref({
    kind: "lines",
    domain,
    id: lineId,
    dir: "inbound",
  });
  const outboundHref = buildExplorerHref({
    kind: "lines",
    domain,
    id: lineId,
    dir: "outbound",
  });

  return (
    <div className="border-b border-border py-2">
      <p className="text-xs text-muted-foreground">Direction</p>
      <p className="text-sm">
        <Link
          href={inboundHref}
          scroll={false}
          onClick={() => onDirectionChange?.("inbound")}
          className={cn(
            "underline-offset-4 hover:underline",
            direction === "inbound" && "font-semibold",
          )}
        >
          inbound
        </Link>
        {" · "}
        <Link
          href={outboundHref}
          scroll={false}
          onClick={() => onDirectionChange?.("outbound")}
          className={cn(
            "underline-offset-4 hover:underline",
            direction === "outbound" && "font-semibold",
          )}
        >
          outbound
        </Link>
      </p>
    </div>
  );
};

const LineInspectorDetailsFallback = ({
  directionToggle,
}: {
  directionToggle: ReactNode;
}) => (
  <>
    <InspectorSection title="Preview">
      <div className="space-y-2" aria-busy aria-label="Loading line status">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-48" />
      </div>
    </InspectorSection>
    <InspectorSection title="Relationships">
      <div className="space-y-2" aria-busy aria-label="Loading stop sequence">
        {directionToggle}
        <Skeleton className="h-4 w-40" />
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-8 w-full" />
        ))}
      </div>
    </InspectorSection>
  </>
);

type LineInspectorDetailsProps = {
  detailsPromise: Promise<ExplorerLineDetailsPayload>;
  expectedLineId: string;
  expectedDirection: ExplorerDirection;
  domain: "tube-rail" | "bus";
  directionToggle: ReactNode;
};

const LineInspectorDetails = ({
  detailsPromise,
  expectedLineId,
  expectedDirection,
  domain,
  directionToggle,
}: LineInspectorDetailsProps) => {
  const payload = use(detailsPromise);
  const { ready, hydrated, loading, error, runKeyed } = useExplorerKeyedQuery();
  const [liveStatus, setLiveStatus] = useState<StatusLine | null>(null);
  const [statusFetchedAt, setStatusFetchedAt] = useState<number | null>(null);

  const lineId = payload.lineId;
  const route = payload.route;
  const status = payload.status;
  const direction = payload.direction;
  const stale =
    lineId !== expectedLineId || direction !== expectedDirection;

  useEffect(() => {
    if (!hydrated || !ready) return;

    let cancelled = false;

    const load = async () => {
      const result = await runKeyed(async (client) => {
        const statuses = await client.line.getStatus({ lineIds: [lineId] });
        return statuses[0] ?? null;
      });
      if (cancelled || !result.ok) return;
      setLiveStatus(result.data);
      setStatusFetchedAt(Date.now());
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [hydrated, ready, lineId, runKeyed]);

  if (stale) {
    return <LineInspectorDetailsFallback directionToggle={directionToggle} />;
  }

  const displayStatus = liveStatus ?? status ?? null;
  const primaryStatus = displayStatus?.lineStatuses?.[0];
  const statusDescription =
    primaryStatus?.statusSeverityDescription ?? "Unknown";
  const severityClass = primaryStatus
    ? getSeverityClasses(primaryStatus.statusSeverity ?? 10, true).text
    : "";
  const normal = displayStatus
    ? isNormalService(displayStatus.lineStatuses ?? [])
    : null;

  const handleRefreshStatus = async () => {
    const result = await runKeyed(async (client) => {
      const statuses = await client.line.getStatus({ lineIds: [lineId] });
      return statuses[0] ?? null;
    });
    if (result.ok) {
      setLiveStatus(result.data);
      setStatusFetchedAt(Date.now());
    }
  };

  return (
    <>
      <InspectorSection title="Preview">
        <div className="space-y-2">
          {ready ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={handleRefreshStatus}
                disabled={loading}
              >
                Refresh status
              </Button>
              <p className="text-xs text-muted-foreground">
                {statusFetchedAt
                  ? `Live · ${new Date(statusFetchedAt).toLocaleTimeString("en-GB")}`
                  : loading
                    ? "Loading live status…"
                    : hydrated
                      ? "Cached example"
                      : "Checking for a TfL API key…"}
              </p>
            </div>
          ) : displayStatus ? (
            <p className="text-xs text-muted-foreground">Cached example</p>
          ) : null}
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          {displayStatus ? (
            <p className={cn("text-sm font-medium", severityClass)}>
              {statusDescription}
              {normal === false ? " — disruption" : null}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {ready
                ? "Live status has not loaded yet."
                : "Cached status not loaded for this line."}
            </p>
          )}
        </div>
      </InspectorSection>

      <InspectorSection title="Relationships">
        <div className="space-y-2">
          {directionToggle}
          <p className="text-xs text-muted-foreground">
            Ordered stops ({direction})
          </p>
          {route.stops.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No stop sequence returned for this line.
            </p>
          ) : (
            <ol className="space-y-1" role="list">
              {route.stops.map((stop, index) => {
                const stopHref = stop.id
                  ? buildExplorerHref({
                      kind: "points",
                      domain: domain === "bus" ? "bus" : "tube-rail",
                      id: stop.id,
                    })
                  : undefined;
                return (
                  <li
                    key={`${stop.id ?? stop.name}-${index}`}
                    className="flex items-baseline gap-3 border-b border-border py-1.5 text-sm last:border-0"
                  >
                    <span className="w-7 tabular-nums text-muted-foreground">
                      {index + 1}
                    </span>
                    {stopHref ? (
                      <Link
                        href={stopHref}
                        className="min-w-0 truncate font-medium underline-offset-4 hover:underline"
                      >
                        {stop.name ?? "Unknown"}
                      </Link>
                    ) : (
                      <span className="min-w-0 truncate font-medium">
                        {stop.name ?? "Unknown"}
                      </span>
                    )}
                    {stop.id ? (
                      <code className="ml-auto shrink-0 text-xs text-muted-foreground">
                        {stop.id}
                      </code>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </InspectorSection>

      <InspectorSection title="Normalised data">
        <InspectorJson
          value={{
            id: lineId,
            direction,
            status: displayStatus
              ? {
                  id: displayStatus.id,
                  name: displayStatus.name,
                  lineStatuses: displayStatus.lineStatuses,
                }
              : null,
            stopCount: route.stops.length,
          }}
        />
      </InspectorSection>
    </>
  );
};

export const LineInspector = ({
  line,
  direction,
  domain,
  detailsPromise,
  detailsPending = false,
  onDirectionChange,
}: LineInspectorProps) => {
  const directionToggle = (
    <LineDirectionToggle
      lineId={line.id}
      direction={direction}
      domain={domain}
      onDirectionChange={onDirectionChange}
    />
  );

  const identity = (
    <div>
      <CopyableField label="Line ID" value={line.id} />
      <CopyableField label="Name" value={line.name} />
      {line.modeName ? (
        <CopyableField label="Mode" value={line.modeName} />
      ) : null}
      <div className="py-2">
        <LineColorBar lineId={line.id} modeName={line.modeName} />
      </div>
    </div>
  );

  const code = (
    <div className="space-y-2">
      <CodeSnippet
        title="line.getStatus"
        code={`await client.line.getStatus({ lineIds: ["${line.id}"] })`}
      />
      <CodeSnippet
        title="line.getRouteSequence"
        code={`await client.line.getRouteSequence({\n  id: "${line.id}",\n  direction: "${direction}",\n})`}
      />
      <CodeSnippet
        title="line.getStopPoints"
        code={`await client.line.getStopPoints("${line.id}")`}
      />
    </div>
  );

  const detailsFallback = (
    <LineInspectorDetailsFallback directionToggle={directionToggle} />
  );

  return (
    <EntityInspectorShell
      title={line.name}
      subtitle={`Line · ${line.modeName ?? domain}`}
      identity={identity}
      details={
        detailsPending || !detailsPromise ? (
          detailsFallback
        ) : (
          <Suspense fallback={detailsFallback}>
            <LineInspectorDetails
              key={line.id}
              detailsPromise={detailsPromise}
              expectedLineId={line.id}
              expectedDirection={direction}
              domain={domain}
              directionToggle={directionToggle}
            />
          </Suspense>
        )
      }
      code={code}
    />
  );
};
