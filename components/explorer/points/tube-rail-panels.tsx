"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PointInspector } from "@/components/explorer/entity-inspector/point-inspector";
import { ExplorerPointMapLazy } from "@/components/explorer/explorer-point-map-lazy";
import { TubeRailPointFinder } from "@/components/explorer/tube-rail-point-finder";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { List, Map as MapIcon } from "lucide-react";
import {
  normaliseRailPoint,
  type ExplorerPoint,
} from "@/lib/tfl/explorer-point-normalise";
import {
  buildExplorerHref,
  type ExplorerState,
} from "@/lib/tfl/explorer-url-state";
import type { ExplorerTubeRailPoint } from "@/lib/tfl/explorer/common";
import { cn } from "@/lib/utils";

const RAIL_MODE_FILTERS = [
  { id: "tube", label: "Tube" },
  { id: "elizabeth-line", label: "Elizabeth line" },
  { id: "dlr", label: "DLR" },
  { id: "overground", label: "Overground" },
  { id: "tram", label: "Tram" },
] as const;

type PointsTubeRailBrowseProps = {
  state: ExplorerState;
  stations: readonly ExplorerTubeRailPoint[];
};

const filterStations = (
  stations: readonly ExplorerTubeRailPoint[],
  query: string,
  mode: string,
  line: string,
  zone: string,
): ExplorerTubeRailPoint[] => {
  const q = query.trim().toLowerCase();
  return stations.filter((station) => {
    if (mode !== "all" && !station.modes.includes(mode as never)) return false;
    if (line !== "all" && !station.lines.includes(line)) return false;
    if (zone !== "all" && station.zone !== zone) return false;
    if (!q) return true;
    return (
      station.displayName.toLowerCase().includes(q) ||
      station.name.toLowerCase().includes(q) ||
      station.id.toLowerCase().includes(q) ||
      station.aliasIds.some((alias) => alias.toLowerCase().includes(q)) ||
      station.lines.some((lineId) => lineId.toLowerCase().includes(q))
    );
  });
};

export const PointsTubeRailBrowse = ({
  state,
  stations,
}: PointsTubeRailBrowseProps) => {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState("all");
  const [line, setLine] = useState("all");
  const [zone, setZone] = useState("all");

  const lineOptions = useMemo(() => {
    const ids = new Set<string>();
    for (const station of stations) {
      for (const lineId of station.lines) ids.add(lineId);
    }
    return [...ids].sort();
  }, [stations]);

  const zoneOptions = useMemo(() => {
    const zones = new Set<string>();
    for (const station of stations) {
      if (station.zone) zones.add(station.zone);
    }
    return [...zones].sort((a, b) => a.localeCompare(b, "en-GB", { numeric: true }));
  }, [stations]);

  const filtered = useMemo(
    () => filterStations(stations, query, mode, line, zone),
    [stations, query, mode, line, zone],
  );

  const points: ExplorerPoint[] = useMemo(
    () => filtered.map(normaliseRailPoint),
    [filtered],
  );

  const selected =
    points.find((point) => point.id === state.id) ??
    (state.id
      ? stations
          .filter(
            (station) =>
              station.id === state.id || station.aliasIds.includes(state.id!),
          )
          .map(normaliseRailPoint)[0]
      : undefined);

  const handleSelect = (point: ExplorerPoint) => {
    router.push(
      buildExplorerHref({ id: point.id, view: state.view }, state),
      { scroll: false },
    );
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1">
            <Label htmlFor="rail-filter">Filter locally</Label>
            <Input
              id="rail-filter"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Name, ID, or line"
              autoComplete="off"
            />
          </div>
          <div
            className="inline-flex rounded-lg border border-border p-0.5"
            role="group"
            aria-label="Results view"
          >
            <Button
              type="button"
              size="sm"
              variant={state.view === "list" ? "secondary" : "ghost"}
              aria-pressed={state.view === "list"}
              onClick={() =>
                router.push(
                  buildExplorerHref({ view: "list" }, state),
                  { scroll: false },
                )
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
                router.push(
                  buildExplorerHref({ view: "map" }, state),
                  { scroll: false },
                )
              }
            >
              <MapIcon className="size-4" aria-hidden />
              Map
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="rail-mode">Mode</Label>
            <NativeSelect
              id="rail-mode"
              value={mode}
              onChange={(event) => setMode(event.target.value)}
            >
              <option value="all">All modes</option>
              {RAIL_MODE_FILTERS.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.label}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1">
            <Label htmlFor="rail-line">Line</Label>
            <NativeSelect
              id="rail-line"
              value={line}
              onChange={(event) => setLine(event.target.value)}
            >
              <option value="all">All lines</option>
              {lineOptions.map((lineId) => (
                <option key={lineId} value={lineId}>
                  {lineId}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1">
            <Label htmlFor="rail-zone">Zone</Label>
            <NativeSelect
              id="rail-zone"
              value={zone}
              onChange={(event) => setZone(event.target.value)}
            >
              <option value="all">All zones</option>
              {zoneOptions.map((zoneId) => (
                <option key={zoneId} value={zoneId}>
                  {zoneId}
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          {filtered.length} of {stations.length} stations (local filter — free)
        </p>

        {state.view === "map" ? (
          <ExplorerPointMapLazy
            points={points}
            selectedId={selected?.id}
            onSelect={handleSelect}
          />
        ) : (
          <ul
            role="listbox"
            aria-label="Tube and rail stations"
            className="max-h-[28rem] space-y-1 overflow-y-auto rounded-lg border border-border p-1"
          >
            {filtered.map((station) => {
              const isSelected =
                station.id === selected?.id ||
                station.aliasIds.includes(selected?.id ?? "");
              return (
                <li key={station.id} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    onClick={() => handleSelect(normaliseRailPoint(station))}
                    className={cn(
                      "flex w-full flex-col gap-0.5 rounded-md px-3 py-2 text-left text-sm",
                      "hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isSelected && "bg-muted ring-1 ring-primary",
                    )}
                  >
                    <span className="flex min-w-0 items-baseline gap-2">
                      <span className="truncate font-medium">
                        {station.displayName}
                      </span>
                      <code className="ml-auto shrink-0 text-xs text-muted-foreground">
                        {station.id}
                      </code>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {[
                        station.modes.join(", "),
                        station.zone ? `Zone ${station.zone}` : null,
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
            Select a station to inspect identity, relationships, and curated
            tfl-ts calls.
          </p>
        )}
      </div>
    </div>
  );
};

type PointsTubeRailFindProps = {
  state: ExplorerState;
};

export const PointsTubeRailFind = ({ state }: PointsTubeRailFindProps) => {
  const router = useRouter();
  const [selected, setSelected] = useState<ExplorerPoint | null>(null);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <TubeRailPointFinder
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
            Search or locate to inspect a station.
          </p>
        )}
      </div>
    </div>
  );
};
