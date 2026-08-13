"use client";

import { Suspense, use, useEffect, useState, type ReactNode } from "react";
import type { RealtimePrediction } from "tfl-ts";
import { BusArrivalsBoard } from "@/components/tfl/arrivals/bus-arrivals-board";
import { RailArrivalsBoard } from "@/components/tfl/arrivals/rail-arrivals-board";
import { CycleHireDocksDetail } from "@/components/tfl/cycle-hire/cycle-hire-docks";
import { Button } from "@/components/ui/button";
import {
  CodeSnippet,
  CopyableField,
  EntityInspectorShell,
  InspectorJson,
} from "@/components/explorer/entity-inspector/entity-inspector";
import { useExplorerKeyedQuery } from "@/hooks/use-explorer-keyed-query";
import type { ExplorerPoint } from "@/lib/tfl/explorer-point-normalise";
import {
  cachedArrivalsForPoint,
  type ExplorerCachedArrivals,
} from "@/lib/tfl/explorer/selection";
import { buildExplorerHref } from "@/lib/tfl/explorer-url-state";
import type { CycleHireDock } from "@/lib/tfl/cycle-hire-types";

type PointInspectorProps = {
  point: ExplorerPoint;
  /** Optional preloaded cycle dock for cached occupancy preview. */
  cycleDock?: CycleHireDock | null;
  /** Site-cached arrivals for the default-selected seed stop. */
  cachedArrivals?: ExplorerCachedArrivals | null;
};

type PointInspectorDeferredProps = Omit<PointInspectorProps, "cachedArrivals"> & {
  /** Unresolved seed arrivals — inspector identity paints while this streams. */
  cachedArrivalsPromise?: Promise<ExplorerCachedArrivals | null>;
  /** Local selection has not caught up to the URL yet — skip a stale promise. */
  detailsPending?: boolean;
};

const PointInspectorFromPromise = ({
  cachedArrivalsPromise,
  ...props
}: Omit<PointInspectorDeferredProps, "cachedArrivalsPromise" | "detailsPending"> & {
  cachedArrivalsPromise: Promise<ExplorerCachedArrivals | null>;
}) => {
  const cachedArrivals = use(cachedArrivalsPromise);
  return <PointInspector {...props} cachedArrivals={cachedArrivals} />;
};

/** Point inspector that streams seed arrivals without blocking identity. */
export const PointInspectorDeferred = ({
  cachedArrivalsPromise,
  detailsPending = false,
  ...props
}: PointInspectorDeferredProps) => {
  if (detailsPending || !cachedArrivalsPromise) {
    return <PointInspector {...props} />;
  }

  return (
    <Suspense fallback={<PointInspector {...props} />}>
      <PointInspectorFromPromise
        {...props}
        cachedArrivalsPromise={cachedArrivalsPromise}
      />
    </Suspense>
  );
};

const KeyPrompt = ({
  purpose,
  onAddKey,
}: {
  purpose: string;
  onAddKey: () => void;
}) => (
  <div className="space-y-3">
    <p className="text-sm text-muted-foreground">{purpose}</p>
    <Button type="button" size="sm" onClick={onAddKey}>
      Add TfL API key
    </Button>
  </div>
);

export const PointInspector = ({
  point,
  cycleDock,
  cachedArrivals = null,
}: PointInspectorProps) => {
  const { ready, hydrated, loading, error, runKeyed, openDialog } =
    useExplorerKeyedQuery();
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
  const seedArrivals = cachedArrivalsForPoint(cachedArrivals, point);

  useEffect(() => {
    setArrivals(null);
    setArrivalsFetchedAt(null);
    setLiveDock(cycleDock ?? null);
    setDockFetchedAt(null);
  }, [point.id, cycleDock]);

  useEffect(() => {
    if (!hydrated || !ready) return;

    let cancelled = false;
    const pointId = point.id;

    const load = async () => {
      if (isBike) {
        const result = await runKeyed(async (client) =>
          client.bikePoint.getById(pointId),
        );
        if (cancelled || !result.ok) return;
        setLiveDock(result.data);
        setDockFetchedAt(Date.now());
        return;
      }

      const result = await runKeyed(async (client) =>
        client.stopPoint.getArrivals({
          stopPointIds: [pointId],
          sortBy: "timeToStation",
        }),
      );
      if (cancelled || !result.ok) return;
      setArrivals(result.data);
      setArrivalsFetchedAt(Date.now());
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [hydrated, ready, point.id, isBike, runKeyed]);

  const handleRefreshArrivals = async () => {
    const result = await runKeyed(async (client) =>
      client.stopPoint.getArrivals({
        stopPointIds: [point.id],
        sortBy: "timeToStation",
      }),
    );
    if (result.ok) {
      setArrivals(result.data);
      setArrivalsFetchedAt(Date.now());
    }
  };

  const handleRefreshDock = async () => {
    const result = await runKeyed(async (client) =>
      client.bikePoint.getById(point.id),
    );
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

  const displayArrivals = arrivals ?? seedArrivals?.arrivals ?? null;
  const occupancyLive = dockFetchedAt !== null;
  const displayDock = liveDock ?? cycleDock ?? null;

  const previewMeta = (label: string | null, refresh: ReactNode) => (
    <div className="flex flex-wrap items-center gap-2">
      {refresh}
      {label ? (
        <p className="text-xs text-muted-foreground">{label}</p>
      ) : null}
    </div>
  );

  const arrivalsBoard = displayArrivals ? (
    isBus ? (
      <BusArrivalsBoard
        data={displayArrivals}
        stopName={point.name}
        stopLetter={point.stopLetter}
        headingLevel={2}
        maxRows={8}
      />
    ) : (
      <RailArrivalsBoard
        data={displayArrivals}
        stopName={point.name}
        lines={point.lineIds?.map((lineId) => ({
          lineId,
          lineName: lineId,
          modeName: point.modes?.[0],
        }))}
        headingLevel={2}
        maxRows={8}
      />
    )
  ) : null;

  const stopPreview = () => {
    if (ready) {
      return (
        <div className="space-y-3">
          {previewMeta(
            arrivalsFetchedAt
              ? `Live · ${new Date(arrivalsFetchedAt).toLocaleTimeString("en-GB")}`
              : loading
                ? "Loading live arrivals…"
                : null,
            <Button
              type="button"
              size="sm"
              onClick={handleRefreshArrivals}
              disabled={loading}
            >
              Refresh arrivals
            </Button>,
          )}
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          {arrivalsBoard}
        </div>
      );
    }
    if (seedArrivals && arrivalsBoard) {
      return (
        <div className="space-y-3">
          {previewMeta("Cached example", null)}
          {arrivalsBoard}
        </div>
      );
    }
    if (!hydrated) {
      return (
        <p className="text-sm text-muted-foreground">Checking for a TfL API key…</p>
      );
    }
    return (
      <KeyPrompt
        purpose="Live arrivals for this stop use your TfL API key."
        onAddKey={openDialog}
      />
    );
  };

  const bikePreview = () => {
    if (ready) {
      return (
        <div className="space-y-3">
          {previewMeta(
            dockFetchedAt
              ? `Live · ${new Date(dockFetchedAt).toLocaleTimeString("en-GB")}`
              : loading
                ? "Loading live occupancy…"
                : null,
            <Button
              type="button"
              size="sm"
              onClick={handleRefreshDock}
              disabled={loading}
            >
              Refresh occupancy
            </Button>,
          )}
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          {displayDock ? (
            <CycleHireDocksDetail data={[displayDock]} hideHeader />
          ) : null}
        </div>
      );
    }
    if (displayDock) {
      return (
        <div className="space-y-3">
          {previewMeta(occupancyLive ? null : "Cached example", null)}
          <CycleHireDocksDetail data={[displayDock]} hideHeader />
        </div>
      );
    }
    if (!hydrated) {
      return (
        <p className="text-sm text-muted-foreground">Checking for a TfL API key…</p>
      );
    }
    return (
      <KeyPrompt
        purpose="Live occupancy for this dock uses your TfL API key."
        onAddKey={openDialog}
      />
    );
  };

  const preview = isBike ? bikePreview() : stopPreview();

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
      {!isBike ? (
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
        <InspectorJson
          value={
            isBike && displayDock
              ? displayDock
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
                  bikes: displayDock?.bikes ?? point.bikes,
                  spaces: displayDock?.spaces ?? point.spaces,
                }
          }
        />
      }
      code={code}
    />
  );
};
