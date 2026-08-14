"use client";

import { useEffect, useMemo, useState } from "react";
import { RailArrivalsBoard } from "@/components/tfl/arrivals/rail-arrivals-board";
import {
  TubeStatusBoard,
  TubeStatusBoardSkeleton,
} from "@/components/tfl/status/tube-status-board";
import { useBoardStatus } from "@/hooks/use-board-status";
import { useDualPathArrivals } from "@/hooks/use-dual-path-arrivals";
import { resolveArrivalsProps } from "@/lib/tfl/board-config-resolve";
import {
  lookupBoardStationLines,
  type BoardStationLinesIndex,
} from "@/lib/tfl/board-station-lines";
import {
  lookupBoardStationName,
  type BoardStationNamesIndex,
} from "@/lib/tfl/board-station-names";
import {
  DEFAULT_BOARD_CONFIG,
  parseBoardConfig,
  type BoardConfig,
} from "@/lib/tfl/board-url-state";

/** Same bound-columns arrangement as the rail arrivals docs demo. */
const BOUND_COLUMNS_CLASS_NAMES = {
  subgroups:
    "@min-[30rem]/arrivals-group:grid-cols-2 @min-[30rem]/arrivals-group:gap-x-6",
} as const;

const useBoardConfigFromHash = (): { config: BoardConfig; ready: boolean } => {
  const [config, setConfig] = useState<BoardConfig>(DEFAULT_BOARD_CONFIG);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const read = () => {
      setConfig(parseBoardConfig(window.location.hash));
      setReady(true);
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  return { config, ready };
};

const DEGRADED_HINT =
  "Using shared demo data. Add your TfL key to the URL for live updates.";

const NO_STOP_HINT =
  "Add a stop id to the URL to show live arrivals for one station.";

type BoardDisplayProps = {
  /** Server-built compact stop → serving lines index. */
  stationLines: BoardStationLinesIndex;
  /** Server-built compact stop → display name index. */
  stationNames: BoardStationNamesIndex;
};

export const BoardDisplay = ({
  stationLines,
  stationNames,
}: BoardDisplayProps) => {
  const { config, ready } = useBoardConfigFromHash();
  const appKey = config.key ?? null;
  const stopId = config.stop ?? "";
  // `stopName` in the URL wins; otherwise resolve the real name from the
  // offline catalog so a bare `#stop=…` link never shows a raw NaPTAN id.
  const stopName =
    config.stopName?.trim() ||
    lookupBoardStationName(stationNames, stopId) ||
    stopId ||
    "Arrivals";

  const status = useBoardStatus({
    appKey,
    enabled: ready,
  });
  const arrivals = useDualPathArrivals({
    stopPointId: ready ? stopId : "",
    appKeyOverride: ready ? appKey : null,
  });

  const servingLines = useMemo(
    () => lookupBoardStationLines(stationLines, stopId),
    [stationLines, stopId],
  );

  const dataLineIds = useMemo(() => {
    const ids = new Set<string>();
    for (const row of arrivals.data) {
      if (row.lineId) ids.add(row.lineId);
    }
    return [...ids];
  }, [arrivals.data]);

  const arrivalsProps = useMemo(
    () => resolveArrivalsProps(config, servingLines, dataLineIds),
    [config, servingLines, dataLineIds],
  );

  const statusHint =
    ready && !appKey && status.source === "site" ? DEGRADED_HINT : null;
  const arrivalsError = !ready
    ? null
    : !stopId
      ? NO_STOP_HINT
      : arrivals.fetchError;

  return (
    <div className="box-border min-h-dvh w-full p-4 md:p-6">
      <h1 className="sr-only">Station arrivals and line status</h1>
      <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-3 md:gap-x-6">
        <section className="min-w-0 md:col-span-2" aria-label="Station arrivals">
          <RailArrivalsBoard
            stopName={stopName}
            stopPointId={stopId || undefined}
            headingLevel={2}
            data={arrivals.data}
            lines={arrivalsProps.lines}
            lineOrder={arrivalsProps.lineOrder}
            pageSize={arrivalsProps.pageSize}
            pageSizeByLine={arrivalsProps.pageSizeByLine}
            loading={arrivals.loading}
            error={arrivalsError}
            classNames={BOUND_COLUMNS_CLASS_NAMES}
          />
        </section>
        <section className="min-w-0 md:col-span-1" aria-label="Line status">
          {!ready ||
          (status.loading && status.data.length === 0 && !status.error) ? (
            <TubeStatusBoardSkeleton compact />
          ) : (
            <TubeStatusBoard data={status.data} hideHeader compact />
          )}
          {status.error ? (
            <p className="mt-3 text-sm text-muted-foreground">{status.error}</p>
          ) : null}
          {statusHint ? (
            <p className="mt-3 text-sm text-muted-foreground">{statusHint}</p>
          ) : null}
        </section>
      </div>
    </div>
  );
};
