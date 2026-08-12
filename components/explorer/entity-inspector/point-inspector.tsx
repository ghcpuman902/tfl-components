"use client";

import { useState } from "react";
import type { RealtimePrediction } from "tfl-ts";
import { BusArrivalsBoard } from "@/components/tfl/arrivals/bus-arrivals-board";
import { CycleHireDocksDetail } from "@/components/tfl/cycle-hire/cycle-hire-docks";
import { Button } from "@/components/ui/button";
import {
  CodeSnippet,
  CopyableField,
  EntityInspectorShell,
} from "@/components/explorer/entity-inspector/entity-inspector";
import { useExplorerKeyedQuery } from "@/hooks/use-explorer-keyed-query";
import type { ExplorerPoint } from "@/lib/tfl/explorer-point-normalise";
import { buildExplorerHref } from "@/lib/tfl/explorer-url-state";
import type { CycleHireDock } from "@/lib/tfl/cycle-hire-types";

type PointInspectorProps = {
  point: ExplorerPoint;
  /** Optional preloaded cycle dock for Browse occupancy preview. */
  cycleDock?: CycleHireDock | null;
};

export const PointInspector = ({ point, cycleDock }: PointInspectorProps) => {
  const { loading, error, runKeyed } = useExplorerKeyedQuery();
  const [arrivals, setArrivals] = useState<RealtimePrediction[] | null>(null);
  const [arrivalsFetchedAt, setArrivalsFetchedAt] = useState<number | null>(
    null,
  );
  const [liveDock, setLiveDock] = useState<CycleHireDock | null>(
    cycleDock ?? null,
  );
  const [dockFetchedAt, setDockFetchedAt] = useState<number | null>(null);

  const isBus =
    point.kind === "stopPoint" &&
    (point.modes?.includes("bus") ||
      Boolean(point.stopLetter || point.smsCode));
  const isBike = point.kind === "bikePoint";

  const handleLoadArrivals = async () => {
    const result = await runKeyed(async (client) => {
      return client.stopPoint.getArrivals({
        stopPointIds: [point.id],
        sortBy: "timeToStation",
      });
    });
    if (result.ok) {
      setArrivals(result.data);
      setArrivalsFetchedAt(Date.now());
    }
  };

  const handleRefreshDock = async () => {
    const result = await runKeyed(async (client) => {
      return client.bikePoint.getById(point.id);
    });
    if (result.ok) {
      setLiveDock(result.data);
      setDockFetchedAt(Date.now());
    }
  };

  const identity = (
    <div>
      <CopyableField label="ID" value={point.id} />
      <CopyableField label="Name" value={point.name} />
      {point.smsCode ? (
        <CopyableField label="SMS code" value={point.smsCode} />
      ) : null}
      {point.stopLetter ? (
        <CopyableField label="Stop letter" value={point.stopLetter} />
      ) : null}
      {point.zone ? <CopyableField label="Zone" value={point.zone} /> : null}
      {point.modes?.length ? (
        <CopyableField label="Modes" value={point.modes.join(", ")} />
      ) : null}
      {typeof point.lat === "number" && typeof point.lon === "number" ? (
        <CopyableField
          label="Coordinates"
          value={`${point.lat.toFixed(5)}, ${point.lon.toFixed(5)}`}
        />
      ) : null}
      {point.towards ? (
        <CopyableField label="Towards" value={point.towards} />
      ) : null}
    </div>
  );

  const relationships = point.lineIds?.length ? (
    <ul className="space-y-1" role="list">
      {point.lineIds.map((lineId) => {
        const isBusLine = /^\d/.test(lineId) || lineId.length <= 3;
        const href = buildExplorerHref({
          kind: "lines",
          domain: isBusLine ? "bus" : "tube-rail",
          tab: "browse",
          id: lineId,
        });
        return (
          <li key={lineId}>
            <a
              href={href}
              className="font-mono text-sm underline-offset-4 hover:underline"
            >
              {lineId}
            </a>
          </li>
        );
      })}
    </ul>
  ) : (
    <p className="text-sm text-muted-foreground">
      No line relationships loaded.
    </p>
  );

  const preview = isBus ? (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          onClick={handleLoadArrivals}
          disabled={loading}
        >
          {arrivals ? "Refresh arrivals" : "Load arrivals"}
        </Button>
        {arrivalsFetchedAt ? (
          <p className="text-xs text-muted-foreground">
            Requested {new Date(arrivalsFetchedAt).toLocaleTimeString("en-GB")}
          </p>
        ) : null}
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {arrivals ? (
        <BusArrivalsBoard
          data={arrivals}
          stopName={point.name}
          stopLetter={point.stopLetter}
          headingLevel={2}
          maxRows={8}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          Live arrivals require your TfL API key and an explicit Load.
        </p>
      )}
    </div>
  ) : isBike ? (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          onClick={handleRefreshDock}
          disabled={loading}
        >
          {liveDock ? "Refresh occupancy" : "Load occupancy"}
        </Button>
        {dockFetchedAt ? (
          <p className="text-xs text-muted-foreground">
            Requested {new Date(dockFetchedAt).toLocaleTimeString("en-GB")}
          </p>
        ) : null}
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {liveDock ? (
        <CycleHireDocksDetail data={[liveDock]} hideHeader />
      ) : (
        <p className="text-sm text-muted-foreground">
          Occupancy requires your TfL API key (or a cached Browse example).
        </p>
      )}
    </div>
  ) : (
    <p className="text-sm text-muted-foreground">
      No live preview for this Tube & rail station in Explorer yet.
    </p>
  );

  const code = (
    <div className="space-y-2">
      <CodeSnippet
        title="stopPoint.get / bikePoint.getById"
        code={
          isBike
            ? `await client.bikePoint.getById("${point.id}")`
            : `await client.stopPoint.get("${point.id}")`
        }
      />
      {isBus ? (
        <CodeSnippet
          title="stopPoint.getArrivals"
          code={`await client.stopPoint.getArrivals({\n  stopPointIds: ["${point.id}"],\n  sortBy: "timeToStation",\n})`}
        />
      ) : null}
      {!isBike ? (
        <CodeSnippet
          title="stopPoint.getRoute"
          code={`await client.stopPoint.getRoute("${point.id}")`}
        />
      ) : null}
    </div>
  );

  return (
    <EntityInspectorShell
      title={point.name}
      subtitle={point.kind === "bikePoint" ? "BikePoint" : "StopPoint"}
      identity={identity}
      preview={preview}
      relationships={relationships}
      normalised={
        <pre className="max-h-64 overflow-auto rounded-lg border border-border bg-muted/30 p-3 text-xs">
          {JSON.stringify(
            isBike && liveDock
              ? liveDock
              : {
                  id: point.id,
                  name: point.name,
                  kind: point.kind,
                  modes: point.modes,
                  lineIds: point.lineIds,
                  zone: point.zone,
                  lat: point.lat,
                  lon: point.lon,
                  stopLetter: point.stopLetter,
                  smsCode: point.smsCode,
                  towards: point.towards,
                  bikes: liveDock?.bikes ?? point.bikes,
                  spaces: liveDock?.spaces ?? point.spaces,
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
