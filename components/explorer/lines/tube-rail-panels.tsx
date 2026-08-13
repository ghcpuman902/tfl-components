"use client";

import { LineInspector } from "@/components/explorer/entity-inspector/line-inspector";
import { useOptimisticLine } from "@/components/explorer/use-optimistic-selection";
import { LineColorBar } from "@/components/tfl/brand/line-badge";
import type { ExplorerState } from "@/lib/tfl/explorer-url-state";
import type {
  ExplorerLineDetailsPayload,
  ExplorerLineSummary,
} from "@/lib/tfl/explorer/common";
import { cn } from "@/lib/utils";

type LinesTubeRailPanelProps = {
  state: ExplorerState;
  lines: readonly ExplorerLineSummary[];
  detailsPromise?: Promise<ExplorerLineDetailsPayload> | null;
};

/** Cached Tube & rail line directory — no keyed lookup required for the full set. */
export const LinesTubeRailPanel = ({
  state,
  lines,
  detailsPromise,
}: LinesTubeRailPanelProps) => {
  const {
    selectedLine,
    direction,
    detailsPending,
    handleSelectLine,
    handleDirectionChange,
  } = useOptimisticLine(lines, state);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start">
      <ul className="grid gap-2 sm:grid-cols-2">
        {lines.map((line) => {
          const selected = line.id === selectedLine?.id;
          return (
            <li key={line.id}>
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => handleSelectLine(line.id)}
                className={cn(
                  "flex w-full flex-col gap-2 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:bg-muted/50",
                  selected && "ring-1 ring-primary",
                )}
              >
                <span
                  data-line={line.id}
                  className="tfl-dark-line-text font-semibold text-[var(--line-color)]"
                >
                  {line.name}
                </span>
                <LineColorBar lineId={line.id} modeName={line.modeName} />
                <code className="text-xs text-muted-foreground">{line.id}</code>
              </button>
            </li>
          );
        })}
      </ul>

      {selectedLine ? (
        <LineInspector
          line={selectedLine}
          direction={direction}
          domain="tube-rail"
          detailsPromise={detailsPromise}
          detailsPending={detailsPending}
          onDirectionChange={handleDirectionChange}
        />
      ) : null}
    </div>
  );
};
