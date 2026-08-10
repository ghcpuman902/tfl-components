import { Suspense } from "react";
import { ArrivalsBoard } from "@/components/tfl/arrivals/arrivals-board";
import { LineStrip } from "@/components/tfl/diagram/line-strip";
import { DIAGRAM_SCALE_CLASS } from "@/lib/tfl/line-diagram";
import {
  VICTORIA_LINE_COLOR,
  VICTORIA_PART_CLOSURE_SEGMENTS,
  VICTORIA_STRIP,
} from "@/lib/tfl/fixtures/victoria-line-strip";
import {
  getCachedHomeBusArrivals,
  getCachedHomeRailArrivals,
  readCacheAgeLabel,
} from "@/lib/tfl/home-arrivals-data";
import { cn } from "@/lib/utils";

type DemoFrameProps = {
  caption: readonly string[];
  className?: string;
  children: React.ReactNode;
};

const DemoFrame = ({ caption, className, children }: DemoFrameProps) => (
  <article className={cn("min-w-0", className)}>
    <div className="min-w-0">{children}</div>
    <footer className="mt-3">
      <p className="text-xs leading-relaxed text-muted-foreground">
        {caption.map((line, index) => (
          <span key={line} className="block sm:inline">
            {index > 0 ? (
              <span className="hidden text-muted-foreground/50 sm:inline">
                {" "}
                ·{" "}
              </span>
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
  const ageLabel = await readCacheAgeLabel(payload.fetchedAt);

  return (
    <DemoFrame caption={["Cached TfL data", ageLabel]}>
      <ArrivalsBoard
        data={payload.arrivals}
        stopName={payload.stopName}
        headingLevel={2}
        error={payload.error ?? null}
        maxRows={10}
        variant="rail"
      />
    </DemoFrame>
  );
}

async function HomeBusPanel() {
  const payload = await getCachedHomeBusArrivals();
  const ageLabel = await readCacheAgeLabel(payload.fetchedAt);

  return (
    <DemoFrame caption={["Cached TfL data", ageLabel]}>
      <ArrivalsBoard
        data={payload.arrivals}
        stopName={payload.stopName}
        headingLevel={2}
        error={payload.error ?? null}
        maxRows={6}
        variant="bus"
      />
    </DemoFrame>
  );
}

const HomeVictoriaPanel = () => (
  <DemoFrame
    caption={["Part-closure example", "Fixture data"]}
    className="overflow-x-auto"
  >
    <div className="mb-4 space-y-1">
      <h2 className="text-lg font-semibold text-foreground">
        Victoria line
      </h2>
      <p className="text-sm text-muted-foreground">
        No service between Seven Sisters and Green Park — fixture only.
      </p>
    </div>
    <div className={cn("min-w-0", DIAGRAM_SCALE_CLASS)}>
      <LineStrip
        lineId="victoria"
        stations={VICTORIA_STRIP}
        lineColor={VICTORIA_LINE_COLOR}
        lineName="Victoria line"
        segments={VICTORIA_PART_CLOSURE_SEGMENTS}
      />
    </div>
  </DemoFrame>
);

type HomeEditorialProps = {
  intro?: React.ReactNode;
};

export const HomeEditorial = ({ intro }: HomeEditorialProps) => (
  <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-start gap-x-8 gap-y-10 px-4 pb-16 md:grid-cols-12 md:px-8 md:gap-y-12">
    {intro ? (
      <div className="min-w-0 md:col-span-12">{intro}</div>
    ) : null}

    <div className="col-span-full grid grid-cols-1 items-start gap-x-8 gap-y-8 md:grid-cols-12 md:gap-y-10">
      <h2 className="col-span-full text-sm font-medium tracking-wide text-muted-foreground">
        Live Examples
      </h2>

      <div className="min-w-0 md:col-span-8">
        <Suspense fallback={<BoardSkeleton />}>
          <HomeDeparturesPanel />
        </Suspense>
      </div>

      <div className="min-w-0 md:col-span-4">
        <Suspense fallback={<BoardSkeleton dense />}>
          <HomeBusPanel />
        </Suspense>
      </div>

      <div className="min-w-0 md:col-span-12">
        <HomeVictoriaPanel />
      </div>
    </div>
  </div>
);
