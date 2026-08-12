"use client";

import Link from "next/link";
import { getSeverityClasses, isNormalService } from "tfl-ts";
import { LineColorBar } from "@/components/tfl/brand/line-badge";
import {
  CodeSnippet,
  CopyableField,
  EntityInspectorShell,
} from "@/components/explorer/entity-inspector/entity-inspector";
import { buildExplorerHref } from "@/lib/tfl/explorer-url-state";
import type { ExplorerDirection } from "@/lib/tfl/explorer-url-state";
import type {
  ExplorerLineRoute,
  ExplorerLineSummary,
} from "@/lib/tfl/explorer/common";
import type { StatusLine } from "@/lib/tfl/status-types";
import { cn } from "@/lib/utils";

type LineInspectorProps = {
  line: ExplorerLineSummary;
  route?: ExplorerLineRoute | null;
  status?: StatusLine | null;
  direction: ExplorerDirection;
  domain: "tube-rail" | "bus";
};

export const LineInspector = ({
  line,
  route,
  status,
  direction,
  domain,
}: LineInspectorProps) => {
  const inboundHref = buildExplorerHref({
    kind: "lines",
    domain,
    tab: "browse",
    id: line.id,
    dir: "inbound",
  });
  const outboundHref = buildExplorerHref({
    kind: "lines",
    domain,
    tab: "browse",
    id: line.id,
    dir: "outbound",
  });

  const primaryStatus = status?.lineStatuses?.[0];
  const statusDescription =
    primaryStatus?.statusSeverityDescription ?? "Unknown";
  const severityClass = primaryStatus
    ? getSeverityClasses(primaryStatus.statusSeverity ?? 10, true).text
    : "";
  const normal = status ? isNormalService(status.lineStatuses ?? []) : null;

  const identity = (
    <div>
      <CopyableField label="Line ID" value={line.id} />
      <CopyableField label="Name" value={line.name} />
      {line.modeName ? (
        <CopyableField label="Mode" value={line.modeName} />
      ) : null}
      <div className="border-b border-border py-2 last:border-0">
        <p className="text-xs text-muted-foreground">Direction</p>
        <p className="text-sm">
          <Link
            href={inboundHref}
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
            className={cn(
              "underline-offset-4 hover:underline",
              direction === "outbound" && "font-semibold",
            )}
          >
            outbound
          </Link>
        </p>
      </div>
      <div className="py-2">
        <LineColorBar lineId={line.id} modeName={line.modeName} />
      </div>
    </div>
  );

  const preview = (
    <div className="space-y-2">
      {status ? (
        <p className={cn("text-sm font-medium", severityClass)}>
          {statusDescription}
          {normal === false ? " — disruption" : null}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Cached status not loaded for this line.
        </p>
      )}
    </div>
  );

  const relationships = (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Ordered stops ({direction})
      </p>
      {!route || route.stops.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No stop sequence returned for this line.
        </p>
      ) : (
        <ol className="max-h-80 space-y-1 overflow-y-auto" role="list">
          {route.stops.map((stop, index) => {
            const stopHref = stop.id
              ? buildExplorerHref({
                  kind: "points",
                  domain: domain === "bus" ? "bus" : "tube-rail",
                  tab: "browse",
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

  return (
    <EntityInspectorShell
      title={line.name}
      subtitle={`Line · ${line.modeName ?? domain}`}
      identity={identity}
      preview={preview}
      relationships={relationships}
      normalised={
        <pre className="max-h-64 overflow-auto rounded-lg border border-border bg-muted/30 p-3 text-xs">
          {JSON.stringify(
            {
              id: line.id,
              name: line.name,
              modeName: line.modeName,
              direction,
              status: status
                ? {
                    id: status.id,
                    name: status.name,
                    lineStatuses: status.lineStatuses,
                  }
                : null,
              stopCount: route?.stops.length ?? 0,
            },
            null,
            2,
          )}
        </pre>
      }
      code={code}
    />
  );
};
