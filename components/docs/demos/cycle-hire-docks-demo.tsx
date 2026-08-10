import { DEFAULT_CYCLE_HIRE_DOCK_IDS } from "@/components/tfl/cycle-hire/cycle-hire-docks";
import { CycleHireDocksDemoClient } from "@/components/docs/demos/cycle-hire-docks-demo-client";
import { DataSourceLabel } from "@/components/docs/data-source-label";
import { getCachedBikePoints } from "@/lib/tfl/cycle-hire-data";

/** Fetch in the docs layer; board only receives `data`. */
export default async function CycleHireDocksDemo() {
  let data: Awaited<ReturnType<typeof getCachedBikePoints>> = [];
  let error: string | null = null;

  try {
    data = (await getCachedBikePoints(DEFAULT_CYCLE_HIRE_DOCK_IDS)) ?? [];
  } catch {
    error =
      "Could not load cycle hire docks. Check TfL credentials and try again.";
  }

  return (
    <div className="space-y-4">
      <DataSourceLabel source="cached" />
      <p className="text-sm text-muted-foreground">
        Occupancy for {DEFAULT_CYCLE_HIRE_DOCK_IDS.length} curated docks.
        Fetched with <code className="text-xs">getCachedBikePoints</code>,
        passed as <code className="text-xs">data</code> from{" "}
        <code className="text-xs">tfl.bikePoint.getById</code>.
      </p>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : (
        <CycleHireDocksDemoClient data={data} />
      )}
    </div>
  );
}
