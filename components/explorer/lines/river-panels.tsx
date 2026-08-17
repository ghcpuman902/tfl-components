"use client";

import {
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Filter } from "lucide-react";
import { LineInspector } from "@/components/explorer/entity-inspector/line-inspector";
import {
  ExplorerSplit,
  explorerPaneClassName,
  explorerResultsPaneClassName,
  explorerSplitFillClassName,
} from "@/components/explorer/explorer-split";
import { useOptimisticLine } from "@/components/explorer/use-optimistic-selection";
import { RiverRouteChip } from "@/components/tfl/arrivals/river-route-chip";
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

type LinesRiverPanelProps = {
  state: ExplorerState;
  lines: readonly ExplorerLineSummary[];
  detailsPromise?: Promise<ExplorerLineDetailsPayload> | null;
};

/** Scroll only the results pane — never the page — when the selected chip is off-screen. */
const scrollSelectedChipIntoPane = (
  container: HTMLElement,
  chip: HTMLElement,
) => {
  if (container.clientHeight === 0) return;

  const chipRect = chip.getBoundingClientRect();
  const paneRect = container.getBoundingClientRect();
  const fullyVisible =
    chipRect.top >= paneRect.top && chipRect.bottom <= paneRect.bottom;
  if (fullyVisible) return;

  const offset = chipRect.top - paneRect.top + container.scrollTop;
  const top = offset - (container.clientHeight - chip.offsetHeight) / 2;
  container.scrollTo({ top: Math.max(0, top) });
};

const filterRiverLines = (
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

/** Cached river-bus line directory — filter locally over wrapping route chips. */
export const LinesRiverPanel = ({
  state,
  lines,
  detailsPromise,
}: LinesRiverPanelProps) => {
  const listId = useId();
  const listPaneRef = useRef<HTMLDivElement>(null);
  const selectedChipRef = useRef<HTMLButtonElement>(null);
  const [query, setQuery] = useState(state.q ?? "");
  const {
    selectedLine,
    direction,
    detailsPending,
    handleSelectLine,
    handleDirectionChange,
  } = useOptimisticLine(lines, state);
  const visibleLines = useMemo(
    () => filterRiverLines(lines, query),
    [lines, query],
  );

  useLayoutEffect(() => {
    const pane = listPaneRef.current;
    const chip = selectedChipRef.current;
    if (!pane || !chip) return;

    scrollSelectedChipIntoPane(pane, chip);
    if (pane.clientHeight > 0) return;

    const frame = requestAnimationFrame(() => {
      scrollSelectedChipIntoPane(pane, chip);
    });
    return () => cancelAnimationFrame(frame);
  }, [selectedLine?.id]);

  const handleFilterSubmit = (event: FormEvent) => {
    event.preventDefault();
    const first = visibleLines[0];
    if (first) handleSelectLine(first.id);
  };

  return (
    <ExplorerSplit
      lead={
        <div
          className={cn(
            "flex min-h-0 min-w-0 flex-col gap-3",
            explorerSplitFillClassName,
          )}
        >
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
                aria-label="Filter river bus routes"
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
                No river routes match. Try another route.
              </p>
            </div>
          ) : (
            <div
              ref={listPaneRef}
              className={cn(
                explorerPaneClassName,
                explorerResultsPaneClassName,
                "overflow-y-auto overscroll-y-auto p-3 scrollbar-thin",
              )}
            >
              <ul
                id={listId}
                className="flex flex-wrap content-start gap-1"
                aria-label="River bus routes"
              >
                {visibleLines.map((line) => {
                  const selected = line.id === selectedLine?.id;
                  return (
                    <li key={line.id}>
                      <button
                        ref={selected ? selectedChipRef : undefined}
                        type="button"
                        aria-pressed={selected}
                        aria-label={line.name}
                        onClick={() => handleSelectLine(line.id)}
                        className={cn(
                          "rounded-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                          selected &&
                            "ring-2 ring-primary ring-offset-2 ring-offset-background",
                        )}
                      >
                        <RiverRouteChip
                          lineId={line.id}
                          lineName={line.name}
                        />
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
            domain="river"
            detailsPromise={detailsPromise}
            detailsPending={detailsPending}
            onDirectionChange={handleDirectionChange}
          />
        ) : null
      }
    />
  );
};
