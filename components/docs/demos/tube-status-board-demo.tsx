import {
  DEFAULT_STATUS_MODES,
  TubeStatusBoard,
} from "@/components/tfl/status/tube-status-board";
import { DataSourceLabel } from "@/components/docs/data-source-label";
import { getCachedLineStatuses } from "@/lib/tfl/status-data";

/** Fetch in the docs layer; board only receives `data`. */
export default async function TubeStatusBoardDemo() {
  let data: Awaited<ReturnType<typeof getCachedLineStatuses>> = [];
  let error: string | null = null;

  try {
    data = (await getCachedLineStatuses()) ?? [];
  } catch {
    error = "Could not load line status. Check TfL credentials and try again.";
  }

  return (
    <div className="space-y-4">
      <DataSourceLabel source="cached" />
      <p className="text-sm text-muted-foreground">
        Status for TfL Tube &amp; Rail modes (
        {DEFAULT_STATUS_MODES.join(", ")}; {data.length || "…"} lines). Cable Car
        is separate on TfL&apos;s own status surface. Data fetched with{" "}
        <code className="text-xs">getCachedLineStatuses</code>, passed as{" "}
        <code className="text-xs">data</code> from{" "}
        <code className="text-xs">tfl.line.getStatus</code>.
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
