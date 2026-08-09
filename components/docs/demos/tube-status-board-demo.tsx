import {
  DEFAULT_STATUS_LINE_IDS,
  TubeStatusBoard,
} from "@/components/tfl/status/tube-status-board";

/** Offline-friendly curated subset; live fetch still runs inside the board. */
export default function TubeStatusBoardDemo() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Live status for the default Underground + Elizabeth set (
        {DEFAULT_STATUS_LINE_IDS.length} lines). Requires server API keys.
      </p>
      <TubeStatusBoard lineIds={DEFAULT_STATUS_LINE_IDS} />
    </div>
  );
}
