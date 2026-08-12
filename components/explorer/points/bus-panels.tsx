"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PointInspector } from "@/components/explorer/entity-inspector/point-inspector";
import { BusPointFinder } from "@/components/explorer/bus-point-finder";
import { ExplorerPointMapLazy } from "@/components/explorer/explorer-point-map-lazy";
import { Button } from "@/components/ui/button";
import { List, Map as MapIcon } from "lucide-react";
import type { ExplorerPoint } from "@/lib/tfl/explorer-point-normalise";
import {
  buildExplorerHref,
  type ExplorerState,
} from "@/lib/tfl/explorer-url-state";
import type { ExplorerBusPoint } from "@/lib/tfl/explorer/common";
import { cn } from "@/lib/utils";

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

type PointsBusBrowseProps = {
  state: ExplorerState;
  stops: readonly ExplorerBusPoint[];
  label: string;
  radiusMeters: number;
};

export const PointsBusBrowse = ({
  state,
  stops,
  label,
  radiusMeters,
}: PointsBusBrowseProps) => {
  const router = useRouter();
  const points = useMemo(() => stops.map(toPoint), [stops]);
  const selected = points.find((point) => point.id === state.id);

  const handleSelect = (point: ExplorerPoint) => {
    router.push(
      buildExplorerHref({ id: point.id, view: state.view }, state),
      { scroll: false },
    );
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground text-pretty">
            Cached example within {radiusMeters}m of {label}. Arbitrary search
            and nearby lookup are under Find (visitor key).
          </p>
          <div
            className="inline-flex shrink-0 rounded-lg border border-border p-0.5"
            role="group"
            aria-label="Results view"
          >
            <Button
              type="button"
              size="sm"
              variant={state.view === "list" ? "secondary" : "ghost"}
              aria-pressed={state.view === "list"}
              onClick={() =>
                router.push(buildExplorerHref({ view: "list" }, state), {
                  scroll: false,
                })
              }
            >
              <List className="size-4" aria-hidden />
              List
            </Button>
            <Button
              type="button"
              size="sm"
              variant={state.view === "map" ? "secondary" : "ghost"}
              aria-pressed={state.view === "map"}
              onClick={() =>
                router.push(buildExplorerHref({ view: "map" }, state), {
                  scroll: false,
                })
              }
            >
              <MapIcon className="size-4" aria-hidden />
              Map
            </Button>
          </div>
        </div>

        {state.view === "map" ? (
          <ExplorerPointMapLazy
            points={points}
            selectedId={selected?.id}
            onSelect={handleSelect}
          />
        ) : (
          <ul
            role="listbox"
            aria-label="Featured bus stops"
            className="max-h-[28rem] space-y-1 overflow-y-auto rounded-lg border border-border p-1"
          >
            {points.map((point) => {
              const isSelected = point.id === selected?.id;
              return (
                <li key={point.id} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    onClick={() => handleSelect(point)}
                    className={cn(
                      "flex w-full flex-col gap-0.5 rounded-md px-3 py-2 text-left text-sm",
                      "hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isSelected && "bg-muted ring-1 ring-primary",
                    )}
                  >
                    <span className="flex min-w-0 items-baseline gap-2">
                      <span className="truncate font-medium">{point.name}</span>
                      {point.stopLetter ? (
                        <span className="text-xs text-muted-foreground">
                          Stop {point.stopLetter}
                        </span>
                      ) : null}
                      <code className="ml-auto shrink-0 text-xs text-muted-foreground">
                        {point.id}
                      </code>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {[
                        point.towards ? `towards ${point.towards}` : null,
                        point.smsCode ? `SMS ${point.smsCode}` : null,
                        point.lineIds?.slice(0, 4).join(", "),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div>
        {selected ? (
          <PointInspector point={selected} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Select a stop to inspect identity and run keyed arrivals.
          </p>
        )}
      </div>
    </div>
  );
};

type PointsBusFindProps = {
  state: ExplorerState;
};

export const PointsBusFind = ({ state }: PointsBusFindProps) => {
  const router = useRouter();
  const [selected, setSelected] = useState<ExplorerPoint | null>(null);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <BusPointFinder
        selectedId={selected?.id ?? state.id}
        view={state.view}
        onViewChange={(view) =>
          router.push(buildExplorerHref({ view }, state), { scroll: false })
        }
        initialQuery={state.q}
        onSelect={(point) => {
          setSelected(point);
          router.push(
            buildExplorerHref({ id: point.id, view: state.view }, state),
            { scroll: false },
          );
        }}
      />
      <div>
        {selected ? (
          <PointInspector point={selected} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Search by name or SMS code, or locate nearby stops.
          </p>
        )}
      </div>
    </div>
  );
};
