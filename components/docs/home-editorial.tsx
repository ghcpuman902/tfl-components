import { Suspense, type CSSProperties } from "react";
import { BusArrivalsBoard } from "@/components/tfl/arrivals/bus-arrivals-board";
import { RailArrivalsBoard } from "@/components/tfl/arrivals/rail-arrivals-board";
import { TfLRoundel } from "@/components/tfl/brand/tfl-roundel";
import { StationNameTitle } from "@/components/tfl/station-name";
import { LineStrip } from "@/components/tfl/diagram/line-strip";
import { WeekAheadLineSkeleton } from "@/components/tfl/week-ahead/week-ahead-skeleton";
import { HomeCycleHireMap } from "@/components/docs/home-cycle-hire-map";
import { CYCLE_HIRE_MAP_HOME_FRAME_CLASSNAME } from "@/components/tfl/cycle-hire/cycle-hire-map-camera";
import { DIAGRAM_SCALE_CLASS } from "@/lib/tfl/line-diagram";
import {
  getCachedHomeCycleHireDocks,
  HOME_CYCLE_HIRE,
} from "@/lib/tfl/cycle-hire-data";
import {
  getCachedHomeBusArrivals,
  getCachedHomeRailArrivals,
  HOME_RAIL_LINES,
  HOME_BUS_STOP,
  readCacheAgeLabel,
  readHomeArrivalsBoardState,
} from "@/lib/tfl/home-arrivals-data";
import { getCachedHomeVictoriaStrip } from "@/lib/tfl/home-victoria-data";
import { cn } from "@/lib/utils";

const ARRIVALS_RHYTHM = {
  "--arrivals-unit": "0.5rem",
  "--arrivals-row": "calc(var(--arrivals-unit) * 6)",
} as CSSProperties;

const ARRIVALS_TILE_CLASS =
  "box-border h-[var(--arrivals-row)] min-h-[var(--arrivals-row)] max-h-[var(--arrivals-row)] shrink-0 overflow-clip";

type DemoFrameProps = {
  caption: readonly string[];
  className?: string;
  style?: CSSProperties;
  children: React.ReactNode;
};

const DemoFrame = ({ caption, className, style, children }: DemoFrameProps) => (
  <article className={cn("min-w-0", className)} style={style}>
    {children}
    {/* Caption = one arrivals tile, flush with the board stack. */}
    <footer
      className={cn(
        "flex items-center text-xs leading-none text-muted-foreground",
        ARRIVALS_TILE_CLASS,
      )}
    >
      <p className="min-w-0 truncate">
        {caption.map((line, index) => (
          <span key={line}>
            {index > 0 ? (
              <span className="text-muted-foreground/50"> · </span>
            ) : null}
            {line}
          </span>
        ))}
      </p>
    </footer>
  </article>
);

const BoardSkeleton = ({ dense = false }: { dense?: boolean }) => (
  <div
    className={cn("animate-pulse space-y-3", dense ? "min-h-48" : "min-h-72")}
    aria-hidden
  >
    <div className="h-8 w-40 bg-muted" />
    <div className="h-4 w-56 bg-muted" />
    <div className="space-y-2 pt-2">
      {Array.from({ length: dense ? 5 : 8 }).map((_, index) => (
        <div key={index} className="h-8 bg-muted/70" />
      ))}
    </div>
  </div>
);

async function HomeDeparturesPanel() {
  const payload = await getCachedHomeRailArrivals();
  const [ageLabel, boardState] = await Promise.all([
    readCacheAgeLabel(payload.fetchedAt),
    readHomeArrivalsBoardState(payload, "rail"),
  ]);

  // Marketing dashboard, not the docs demo: quietly drop a line's stable
  // "No information" placeholder here rather than showing it as a first
  // impression. `RailArrivalsBoard`'s default (seed every declared line/
  // bound so it never disappears) stays the library behaviour — see
  // `RailArrivalsLine.bounds` in lib/tfl/arrivals-prepare.ts.
  const activeLineIds = new Set(
    payload.arrivals.map((arrival) => arrival.lineId).filter(Boolean),
  );
  const homeRailLines = HOME_RAIL_LINES.filter((line) =>
    activeLineIds.has(line.lineId),
  );

  return (
    <DemoFrame caption={["Cached TfL data", ageLabel]} style={ARRIVALS_RHYTHM}>
      <RailArrivalsBoard
        data={payload.arrivals}
        now={payload.fetchedAt}
        lines={homeRailLines}
        stopName={payload.stopName}
        headingLevel={2}
        error={boardState.error}
        emptyKind={boardState.emptyKind}
        maxRows={10}
        pageSize={2}
      />
    </DemoFrame>
  );
}

async function HomeBusAndCycleHirePanel() {
  const [bus, cycle] = await Promise.all([
    getCachedHomeBusArrivals(),
    getCachedHomeCycleHireDocks(),
  ]);
  const [ageLabel, busState] = await Promise.all([
    readCacheAgeLabel(Math.max(bus.fetchedAt, cycle.fetchedAt)),
    readHomeArrivalsBoardState(bus, "bus"),
  ]);

  const cycleCaption = cycle.error
    ? (["Cached TfL data", ageLabel, "Unavailable"] as const)
    : cycle.docks.length === 0
      ? (["Cached TfL data", ageLabel, "No docks nearby"] as const)
      : (["Cached TfL data", ageLabel] as const);

  return (
    <DemoFrame caption={cycleCaption} style={ARRIVALS_RHYTHM}>
      <BusArrivalsBoard
        data={bus.arrivals}
        now={bus.fetchedAt}
        stopName={bus.stopName}
        stopLetter={HOME_BUS_STOP.stopLetter}
        headingLevel={2}
        error={busState.error}
        emptyKind={busState.emptyKind}
        maxRows={6}
        pageSize={2}
        groupBy="route"
      />

      <h2
        className={cn(
          "tfl-title mt-[var(--arrivals-row)] flex h-full min-w-0 items-center gap-x-2 text-3xl leading-none text-foreground",
          ARRIVALS_TILE_CLASS,
        )}
        aria-label={HOME_CYCLE_HIRE.label}
      >
        <TfLRoundel
          variant="cycles"
          className="size-[var(--arrivals-row)] shrink-0"
          aria-hidden
        />
        <StationNameTitle name={HOME_CYCLE_HIRE.label} />
      </h2>
      {cycle.error ? (
        <p
          className={cn(
            "flex items-center text-sm text-muted-foreground",
            ARRIVALS_TILE_CLASS,
          )}
          role="status"
        >
          Live docks are unavailable right now.
        </p>
      ) : cycle.docks.length === 0 ? (
        <p
          className={cn(
            "flex items-center text-sm text-muted-foreground",
            ARRIVALS_TILE_CLASS,
          )}
          role="status"
        >
          No docks found nearby.
        </p>
      ) : (
        <HomeCycleHireMap
          data={cycle.docks}
          markerSize={28}
          showNavigation={false}
        />
      )}
    </DemoFrame>
  );
}

const BusAndCycleHireSkeleton = () => (
  <div style={ARRIVALS_RHYTHM} aria-hidden>
    <BoardSkeleton dense />
    <div
      className={cn(
        "mt-[var(--arrivals-row)] animate-pulse bg-muted",
        ARRIVALS_TILE_CLASS,
      )}
    />
    <div
      className={cn(
        "w-full animate-pulse bg-muted/70",
        CYCLE_HIRE_MAP_HOME_FRAME_CLASSNAME,
      )}
    />
  </div>
);

async function HomeVictoriaPanel() {
  const payload = await getCachedHomeVictoriaStrip();
  const ageLabel = await readCacheAgeLabel(payload.fetchedAt);
  const statusLabel = payload.service.labels[0];
  const notices = [
    statusLabel,
    payload.service.note,
    payload.spine.routeError ? "Route sequence unavailable" : null,
    payload.statusError ? "Live status is unavailable right now." : null,
  ].filter((value): value is string => Boolean(value));

  return (
    <DemoFrame
      caption={
        payload.statusError
          ? ["Route geometry", "Live status unavailable"]
          : ["Cached TfL data", ageLabel]
      }
      className="overflow-x-auto"
      style={ARRIVALS_RHYTHM}
    >
      {notices.length > 0 ? (
        <div className="mb-4 space-y-1">
          {notices.map((notice) => (
            <p key={notice} className="text-sm text-muted-foreground">
              {notice}
            </p>
          ))}
        </div>
      ) : null}
      {payload.spine.stations.length > 0 ? (
        <div className={cn("min-w-0", DIAGRAM_SCALE_CLASS)}>
          <LineStrip
            lineId={payload.spine.lineId}
            stations={payload.spine.stations}
            lineColor={payload.spine.lineColor}
            lineName={payload.spine.lineName}
            segments={payload.service.segments}
            stationOutOfUseIds={payload.service.stationOutOfUseIds}
            forceLabelIds={payload.service.forceLabelIds}
          />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No outbound spine available for this line.
        </p>
      )}
    </DemoFrame>
  );
}

type HomeEditorialProps = {
  intro?: React.ReactNode;
};

export const HomeEditorial = ({ intro }: HomeEditorialProps) => (
  <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-start gap-x-8 gap-y-10 px-4 pb-16 md:grid-cols-12 md:px-8 md:gap-y-12">
    {intro ? <div className="min-w-0 md:col-span-12">{intro}</div> : null}

    <div className="col-span-full grid grid-cols-1 items-start gap-x-8 gap-y-8 md:grid-cols-12 md:gap-y-10">
      <div className="min-w-0 md:col-span-8">
        <Suspense fallback={<BoardSkeleton />}>
          <HomeDeparturesPanel />
        </Suspense>
      </div>

      <div className="min-w-0 md:col-span-4">
        <Suspense fallback={<BusAndCycleHireSkeleton />}>
          <HomeBusAndCycleHirePanel />
        </Suspense>
      </div>

      <div className="min-w-0 md:col-span-12">
        <Suspense fallback={<WeekAheadLineSkeleton lineId="victoria" />}>
          <HomeVictoriaPanel />
        </Suspense>
      </div>
    </div>
  </div>
);
