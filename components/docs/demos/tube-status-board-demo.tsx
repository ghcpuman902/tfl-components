import {
  DEFAULT_STATUS_LINE_IDS,
  TubeStatusBoard,
} from "@/components/tfl/status/tube-status-board";
import { getCachedLineStatuses } from "@/lib/tfl/status-data";

/** Fetch in the docs layer; board only receives `data`. */
export default async function TubeStatusBoardDemo() {
  let data: Awaited<ReturnType<typeof getCachedLineStatuses>> = [];
  let error: string | null = null;

  try {
    data = (await getCachedLineStatuses(DEFAULT_STATUS_LINE_IDS)) ?? [];
  } catch {
    error = "Could not load line status. Check TfL credentials and try again.";
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Status for the default Underground + Elizabeth set (
        {DEFAULT_STATUS_LINE_IDS.length} lines). Data fetched with{" "}
        <code className="text-xs">getCachedLineStatuses</code>, passed as{" "}
        <code className="text-xs">data</code>.
      </p>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <TubeStatusBoard data={data} hideHeader />
    </div>
  );
}
