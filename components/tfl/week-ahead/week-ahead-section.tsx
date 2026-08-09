import { Suspense } from "react";
import { connection } from "next/server";
import { WeekAheadLineSkeleton } from "@/components/tfl/week-ahead/week-ahead-skeleton";
import {
  WeekAheadLineRow,
  WeekAheadShell,
  WeekAheadStatusHydrator,
} from "@/components/tfl/week-ahead/week-ahead-view";
import {
  getCachedLineRoute,
  getCachedWeekAheadStatuses,
} from "@/lib/tfl/week-ahead-data";
import { buildWeekAheadDays } from "@/lib/tfl/london-dates";
import {
  WEEK_AHEAD_LINE_IDS,
  type WeekAheadLineId,
} from "@/lib/tfl/week-ahead-status";

/**
 * Request-time “today”, then paint the shell immediately.
 * Each line streams under its own Suspense; status is a separate cache.
 */
async function WeekAheadBody() {
  await connection();
  const range = buildWeekAheadDays(new Date());

  return (
    <WeekAheadShell days={range.days}>
      <div className="space-y-10">
        {WEEK_AHEAD_LINE_IDS.map((lineId) => (
          <Suspense
            key={lineId}
            fallback={<WeekAheadLineSkeleton lineId={lineId} />}
          >
            <WeekAheadLineSlot lineId={lineId} />
          </Suspense>
        ))}
      </div>

      <Suspense fallback={null}>
        <WeekAheadStatusSlot
          startDate={range.startDate}
          endDate={range.endDate}
        />
      </Suspense>
    </WeekAheadShell>
  );
}

async function WeekAheadLineSlot({ lineId }: { lineId: WeekAheadLineId }) {
  const route = await getCachedLineRoute(lineId);
  return <WeekAheadLineRow route={route} />;
}

async function WeekAheadStatusSlot({
  startDate,
  endDate,
}: {
  startDate: string;
  endDate: string;
}) {
  const status = await getCachedWeekAheadStatuses(startDate, endDate);
  return <WeekAheadStatusHydrator status={status} />;
}

/** Homepage introduction — shell + routes first; live status overlays later. */
export const WeekAheadSection = () => <WeekAheadBody />;
