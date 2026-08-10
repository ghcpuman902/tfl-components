import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type DataSourceKind = "cached" | "fixture" | "live";

const LABELS: Record<DataSourceKind, string> = {
  cached: "Cached data",
  fixture: "Fixture data",
  live: "Live data",
};

const HINTS: Record<DataSourceKind, string> = {
  cached: "Site cache — suitable for general demonstrations.",
  fixture: "Deterministic fixture — use for hard-to-hit states.",
  live: "Live TfL request — requires your own credentials in the app layer.",
};

type DataSourceLabelProps = {
  source: DataSourceKind;
  className?: string;
  /** Show the short hint beside the badge. */
  showHint?: boolean;
};

/** Shared vocabulary for example / preview data provenance. */
export const DataSourceLabel = ({
  source,
  className,
  showHint = true,
}: DataSourceLabelProps) => (
  <div
    className={cn(
      "flex flex-wrap items-center gap-2 text-xs text-muted-foreground",
      className,
    )}
  >
    <Badge variant="outline">{LABELS[source]}</Badge>
    {showHint ? <span>{HINTS[source]}</span> : null}
  </div>
);
