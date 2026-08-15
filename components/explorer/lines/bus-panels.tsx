"use client";

import { useId, useMemo, useState, type FormEvent } from "react";
import { Filter } from "lucide-react";
import { LineInspector } from "@/components/explorer/entity-inspector/line-inspector";
import {
  ExplorerSplit,
  explorerPaneClassName,
  explorerResultsPaneClassName,
} from "@/components/explorer/explorer-split";
import { useOptimisticLine } from "@/components/explorer/use-optimistic-selection";
import { BusNumberChip } from "@/components/tfl/arrivals/bus-number-chip";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import type { ExplorerState } from "@/lib/tfl/explorer-url-state";
import type {
  ExplorerLineDetailsPayload,
  ExplorerLineSummary,
} from "@/lib/tfl/explorer/common";
import { cn } from "@/lib/utils";

type LinesBusPanelProps = {
  state: ExplorerState;
  lines: readonly ExplorerLineSummary[];
  detailsPromise?: Promise<ExplorerLineDetailsPayload> | null;
};

const filterBusLines = (
  lines: readonly ExplorerLineSummary[],
  query: string,
): readonly ExplorerLineSummary[] => {
  const q = query.trim().toLowerCase();
  if (!q) return lines;
  return lines.filter(
    (line) =>
      line.id.toLowerCase().includes(q) ||
      line.name.toLowerCase().includes(q),
  );
};

/** Cached London bus line directory — filter locally over wrapping route chips. */
export const LinesBusPanel = ({
  state,
  lines,
  detailsPromise,
}: LinesBusPanelProps) => {
  const listId = useId();
  const [query, setQuery] = useState(state.q ?? "");
  const {
    selectedLine,
    direction,
    detailsPending,
    handleSelectLine,
    handleDirectionChange,
  } = useOptimisticLine(lines, state);
  const visibleLines = useMemo(
    () => filterBusLines(lines, query),
    [lines, query],
  );

  const handleFilterSubmit = (event: FormEvent) => {
    event.preventDefault();
    const first = visibleLines[0];
    if (first) handleSelectLine(first.id);
  };

  return (
    <ExplorerSplit
      lead={
        <div className="flex min-h-0 min-w-0 flex-col gap-3 lg:h-full">
          <form onSubmit={handleFilterSubmit}>
            <InputGroup className="h-9 min-w-0">
              <InputGroupAddon align="inline-start">
                <Filter className="size-4" aria-hidden />
              </InputGroupAddon>
              <InputGroupInput
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Filter routes"
                aria-label="Filter bus routes"
                aria-controls={listId}
                autoComplete="off"
              />
            </InputGroup>
          </form>

          {visibleLines.length === 0 ? (
            <div
              className={cn(
                explorerPaneClassName,
                explorerResultsPaneClassName,
                "flex items-center p-4",
              )}
            >
              <p className="text-sm text-muted-foreground">
                No bus routes match. Try another route number.
              </p>
            </div>
          ) : (
            <div
              className={cn(
                explorerPaneClassName,
                explorerResultsPaneClassName,
                "overflow-y-auto overscroll-y-auto p-3 scrollbar-thin lg:overscroll-contain",
              )}
            >
              <ul
                id={listId}
                className="flex flex-wrap content-start gap-1"
                aria-label="Bus routes"
              >
                {visibleLines.map((line) => {
                  const selected = line.id === selectedLine?.id;
                  return (
                    <li key={line.id}>
                      <button
                        type="button"
                        aria-pressed={selected}
                        aria-label={`Route ${line.name}`}
                        onClick={() => handleSelectLine(line.id)}
                        className={cn(
                          "rounded-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                          selected &&
                            "ring-2 ring-primary ring-offset-2 ring-offset-background",
                        )}
                      >
                        <BusNumberChip label={line.name} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      }
      inspector={
        selectedLine ? (
          <LineInspector
            line={selectedLine}
            direction={direction}
            domain="bus"
            detailsPromise={detailsPromise}
            detailsPending={detailsPending}
            onDirectionChange={handleDirectionChange}
          />
        ) : null
      }
    />
  );
};
