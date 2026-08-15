"use client";

import { Suspense, use, useEffect, useState } from "react";
import type { RealtimePrediction } from "tfl-ts";
import { DataSourceLabel } from "@/components/docs/data-source-label";
import { BusArrivalsBoard } from "@/components/tfl/arrivals/bus-arrivals-board";
import { resolveBusStopLetter } from "@/lib/tfl/bus-stop-letter";
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
import { compareArrivalsLines } from "@/lib/tfl/arrivals-line-sort";
import {
  prepareBusStopDisruptions,
  type RawBusStopDisruption,
} from "@/lib/tfl/bus-stop-disruptions";
import type { CycleHireDock } from "@/lib/tfl/cycle-hire-types";
import type { ExplorerPoint } from "@/lib/tfl/explorer-point-normalise";
import {
  cachedArrivalsForPoint,
  type ExplorerCachedArrivals,
} from "@/lib/tfl/explorer/selection";
import { buildExplorerHref } from "@/lib/tfl/explorer-url-state";
import { getLineNameTiers, railLineModeName } from "@/lib/tfl/line-names";

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

const PointInspectorLive = ({
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
  const [disruptions, setDisruptions] = useState<RawBusStopDisruption[]>([]);
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
  const pollStopIds =
    point.arrivalsStopIds?.length ? point.arrivalsStopIds : [point.id];
  const pollStopKey = pollStopIds.join(",");
  const isHub = (point.hubMembers?.length ?? 0) > 1;
  const displayArrivals = arrivals ?? seedArrivals?.arrivals ?? null;
  const resolvedStopLetter = isBus
    ? resolveBusStopLetter(point.stopLetter, displayArrivals ?? [])
    : (point.stopLetter ?? null);

  useEffect(() => {
    if (!hydrated || !ready) return;

    let cancelled = false;
    const pointId = point.id;
    const stopPointIds = pollStopKey.split(",").filter(Boolean);

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

      const result = await runKeyed(async (client) => {
        const [predictions, stopDisruptions] = await Promise.all([
          client.stopPoint.getArrivals({
            stopPointIds,
            sortBy: "timeToStation",
          }),
          isBus ? client.stopPoint.getDisruption({ stopPointIds }) : [],
        ]);
        return { predictions, stopDisruptions };
      });
      if (cancelled || !result.ok) return;
      setArrivals(result.data.predictions);
      setDisruptions(result.data.stopDisruptions);
      setArrivalsFetchedAt(Date.now());
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [hydrated, ready, point.id, pollStopKey, isBike, isBus, runKeyed]);

  const handleRefreshArrivals = async () => {
    const stopPointIds = [...pollStopIds];
    const result = await runKeyed(async (client) => {
      const [predictions, stopDisruptions] = await Promise.all([
        client.stopPoint.getArrivals({
          stopPointIds,
          sortBy: "timeToStation",
        }),
        isBus ? client.stopPoint.getDisruption({ stopPointIds }) : [],
      ]);
      return { predictions, stopDisruptions };
    });
    if (result.ok) {
      setArrivals(result.data.predictions);
      setDisruptions(result.data.stopDisruptions);
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
      {isHub && point.hubId ? (
        <CopyableField label="Hub" value={point.hubId} />
      ) : null}
      {point.smsCode ? (
        <CopyableField label="SMS code" value={point.smsCode} />
      ) : null}
      {resolvedStopLetter ? (
        <CopyableField label="Stop letter" value={resolvedStopLetter} />
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
      {isHub ? (
        <div className="pt-3">
          <p className="text-xs text-muted-foreground">
            StopPoints in this hub. Poll each id that carries the line you want.
          </p>
          {point.hubMembers?.map((member) => (
            <CopyableField
              key={member.id}
              label={member.name}
              value={member.id}
            />
          ))}
        </div>
      ) : null}
    </div>
  );

  const lineIds = [...(point.lineIds ?? [])].sort((a, b) =>
    compareArrivalsLines(
      { lineId: a, lineName: getLineNameTiers(a).full },
      { lineId: b, lineName: getLineNameTiers(b).full },
    ),
  );

  const stopIdForLine = (lineId: string): string | undefined =>
    point.hubMembers?.find((member) => member.lineIds.includes(lineId))?.id;

  const relationships = lineIds.length ? (
    <ul className="space-y-1" role="list">
      {lineIds.map((lineId) => {
        const isBusLine = /^\d/.test(lineId) || lineId.length <= 3;
        const href = buildExplorerHref({
          kind: "lines",
          domain: isBusLine ? "bus" : "tube-rail",
          id: lineId,
        });
        const memberId = stopIdForLine(lineId);
        return (
          <li
            key={lineId}
            className="flex items-baseline gap-3 border-b border-border py-1.5 last:border-0"
          >
            <a
              href={href}
              className="min-w-0 truncate text-sm underline-offset-4 hover:underline"
            >
              {getLineNameTiers(lineId).full}
            </a>
            {memberId ? (
              <code className="ml-auto shrink-0 text-xs text-muted-foreground">
                {memberId}
              </code>
            ) : null}
          </li>
        );
      })}
    </ul>
  ) : (
    <p className="text-sm text-muted-foreground">
      No line relationships loaded.
    </p>
  );

  const displayDock = liveDock ?? cycleDock ?? null;

  const busStopDisruptions = isBus
    ? prepareBusStopDisruptions(disruptions, displayArrivals ?? [])
    : [];

  const arrivalsBoard = displayArrivals ? (
    isBus ? (
      <BusArrivalsBoard
        data={displayArrivals}
        disruptions={busStopDisruptions}
        stopName={point.name}
        stopLetter={resolvedStopLetter ?? undefined}
        headingLevel={2}
        maxRows={8}
      />
    ) : (
      <RailArrivalsBoard
        data={displayArrivals}
        now={arrivalsFetchedAt ?? undefined}
        stopName={point.name}
        lines={lineIds.map((lineId) => ({
          lineId,
          lineName: getLineNameTiers(lineId).full,
          modeName: railLineModeName(lineId),
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
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          {arrivalsBoard}
          <DataSourceLabel
            source="live"
            fetchedAt={arrivalsFetchedAt ?? undefined}
            loading={loading}
            onRefresh={handleRefreshArrivals}
          />
        </div>
      );
    }
    if (seedArrivals && arrivalsBoard) {
      return (
        <div className="space-y-3">
          {arrivalsBoard}
          <DataSourceLabel source="cached" />
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
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          {displayDock ? (
            <CycleHireDocksDetail data={[displayDock]} hideHeader />
          ) : null}
          <DataSourceLabel
            source="live"
            fetchedAt={dockFetchedAt ?? undefined}
            loading={loading}
            onRefresh={handleRefreshDock}
          />
        </div>
      );
    }
    if (displayDock) {
      return (
        <div className="space-y-3">
          <CycleHireDocksDetail data={[displayDock]} hideHeader />
          <DataSourceLabel source="cached" />
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
          code={`await client.stopPoint.getArrivals({\n  stopPointIds: ${JSON.stringify(pollStopIds)},\n  sortBy: "timeToStation",\n})`}
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
      subtitle={
        point.kind === "bikePoint"
          ? "BikePoint"
          : isHub
            ? "Station hub"
            : "StopPoint"
      }
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
                  hubId: point.hubId,
                  hubMembers: point.hubMembers,
                  arrivalsStopIds: pollStopIds,
                  aliasIds: point.aliasIds,
                  zone: point.zone,
                  lat: point.lat,
                  lon: point.lon,
                  stopLetter: resolvedStopLetter ?? point.stopLetter,
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

/** Remount live arrivals/occupancy state when the selected point changes. */
export const PointInspector = (props: PointInspectorProps) => (
  <PointInspectorLive key={props.point.id} {...props} />
);
