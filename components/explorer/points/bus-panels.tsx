"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { PointInspectorDeferred } from "@/components/explorer/entity-inspector/point-inspector";
import { BusPointFinder } from "@/components/explorer/bus-point-finder";
import { ExplorerSplit } from "@/components/explorer/explorer-split";
import { useOptimisticPoint } from "@/components/explorer/use-optimistic-selection";
import type { ExplorerPoint } from "@/lib/tfl/explorer-point-normalise";
import {
  buildExplorerHref,
  type ExplorerState,
} from "@/lib/tfl/explorer-url-state";
import type { ExplorerBusPoint } from "@/lib/tfl/explorer/common";
import type { ExplorerCachedArrivals } from "@/lib/tfl/explorer/selection";

const toPoint = (stop: ExplorerBusPoint): ExplorerPoint => ({
  id: stop.id,
  name: stop.name,
  kind: "stopPoint",
  lat: stop.lat,
  lon: stop.lon,
  modes: ["bus"],
  lineIds: stop.lines,
  stopLetter: stop.stopLetter,
  smsCode: stop.smsCode,
  towards: stop.towards,
  distanceMeters: stop.distance,
});

type PointsBusFindProps = {
  state: ExplorerState;
  stops: readonly ExplorerBusPoint[];
  label: string;
  radiusMeters: number;
  cachedArrivalsPromise?: Promise<ExplorerCachedArrivals | null>;
};

export const PointsBusFind = ({
  state,
  stops,
  label,
  radiusMeters,
  cachedArrivalsPromise,
}: PointsBusFindProps) => {
  const router = useRouter();
  const initialPoints = useMemo(() => stops.map(toPoint), [stops]);
  const { selected, detailsPending, handleSelectPoint } = useOptimisticPoint(
    initialPoints,
    state,
  );

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground text-pretty">
        Cached example within {radiusMeters}m of {label}.
      </p>
      <ExplorerSplit
        lead={
          <BusPointFinder
            selectedId={selected?.id ?? state.id}
            view={state.view}
            onViewChange={(view) =>
              router.push(buildExplorerHref({ view }, state), { scroll: false })
            }
            initialQuery={state.q}
            initialPoints={initialPoints}
            onSelect={handleSelectPoint}
          />
        }
        inspector={
          selected ? (
            <PointInspectorDeferred
              point={selected}
              cachedArrivalsPromise={cachedArrivalsPromise}
              detailsPending={detailsPending}
            />
          ) : null
        }
      />
    </div>
  );
};
