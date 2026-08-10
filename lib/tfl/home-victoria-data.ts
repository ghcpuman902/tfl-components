import { cacheLife, cacheTag } from "next/cache";
import { getTflClient } from "@/lib/tfl/client";
import { buildWeekAheadDays } from "@/lib/tfl/london-dates";
import { getLineSpine, type LineSpine } from "@/lib/tfl/line-spine";
import {
  buildDayLineServiceState,
  type DayLineServiceState,
  type LineStatusLike,
} from "@/lib/tfl/week-ahead-status";

export type HomeVictoriaStripPayload = {
  spine: LineSpine;
  service: DayLineServiceState;
  fetchedAt: number;
  statusError?: string;
};

/**
 * Homepage Victoria line strip — live spine + today’s status overlay.
 * Site/demo fetch only; keep out of the reusable `LineStrip` API.
 */
export async function getCachedHomeVictoriaStrip(): Promise<HomeVictoriaStripPayload> {
  "use cache";
  cacheLife({ revalidate: 60 });
  cacheTag("tfl-line-status", "tfl-route", "tfl-home-victoria");

  const fetchedAt = Date.now();
  const spine = await getLineSpine("victoria");
  const today = buildWeekAheadDays(new Date(fetchedAt)).days[0]!;

  try {
    const client = getTflClient();
    const lines = await client.line.getStatus({
      lineIds: ["victoria"],
      detail: true,
    });
    // Live rows often omit validityPeriods; treat those as today’s window so
    // buildDayLineServiceState does not drop them (it only keeps day overlaps).
    const statuses = ((lines[0]?.lineStatuses ?? []) as LineStatusLike[]).map(
      (status) =>
        (status.validityPeriods?.length ?? 0) > 0
          ? status
          : {
              ...status,
              validityPeriods: [
                {
                  fromDate: today.startIso,
                  toDate: today.endIso,
                },
              ],
            },
    );
    const service = buildDayLineServiceState(
      spine.spineIds,
      statuses,
      today.startMs,
      today.endMs,
    );

    return { spine, service, fetchedAt };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not load live status";
    return {
      spine,
      service: buildDayLineServiceState(
        spine.spineIds,
        [],
        today.startMs,
        today.endMs,
      ),
      fetchedAt,
      statusError: message,
    };
  }
}
