"use client";

import { useRouter } from "next/navigation";
import { LineInspector } from "@/components/explorer/entity-inspector/line-inspector";
import { LineColorBar } from "@/components/tfl/brand/line-badge";
import {
  buildExplorerHref,
  type ExplorerState,
} from "@/lib/tfl/explorer-url-state";
import type {
  ExplorerLineRoute,
  ExplorerModeGroup,
} from "@/lib/tfl/explorer/common";
import type { StatusLine } from "@/lib/tfl/status-types";
import { cn } from "@/lib/utils";

type LinesTubeRailBrowseProps = {
  state: ExplorerState;
  groups: readonly ExplorerModeGroup[];
  route?: ExplorerLineRoute | null;
  status?: StatusLine | null;
};

export const LinesTubeRailBrowse = ({
  state,
  groups,
  route,
  status,
}: LinesTubeRailBrowseProps) => {
  const router = useRouter();
  const selectedId = state.id;
  const selectedLine =
    groups
      .flatMap((group) => group.lines)
      .find((line) => line.id === selectedId) ?? null;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="space-y-6">
        {groups.map(({ mode, lines }) => (
          <section key={mode.id} className="space-y-2">
            <h3 className="text-sm font-semibold">{mode.label}</h3>
            <ul className="grid gap-2 sm:grid-cols-2" role="list">
              {lines.map((line) => {
                const selected = line.id === selectedId;
                return (
                  <li key={line.id}>
                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          buildExplorerHref(
                            {
                              id: line.id,
                              dir: state.dir,
                            },
                            state,
                          ),
                          { scroll: false },
                        )
                      }
                      className={cn(
                        "w-full rounded-lg border border-border bg-card p-3 text-left transition-colors hover:bg-muted/50",
                        selected && "ring-1 ring-primary",
                      )}
                    >
                      <span
                        data-line={line.id}
                        className="tfl-dark-line-text font-semibold text-[var(--line-color)]"
                      >
                        {line.name}
                      </span>
                      <div className="mt-2">
                        <LineColorBar
                          lineId={line.id}
                          modeName={line.modeName ?? mode.id}
                        />
                      </div>
                      <code className="mt-2 block text-xs text-muted-foreground">
                        {line.id}
                      </code>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      <div>
        {selectedLine ? (
          <LineInspector
            line={selectedLine}
            route={route}
            status={status}
            direction={state.dir}
            domain="tube-rail"
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Select a line to inspect status, route sequence, and curated
            tfl-ts calls.
          </p>
        )}
      </div>
    </div>
  );
};

type LinesTubeRailFindProps = {
  state: ExplorerState;
};

/** Lines Find for tube-rail: local filter over the same directory is free; keep UX simple. */
export const LinesTubeRailFind = ({ state }: LinesTubeRailFindProps) => (
  <p className="text-sm text-muted-foreground text-pretty">
    Tube & rail lines are fully available under Browse (cached directory). Use
    Browse and filter by selecting a line — no keyed lookup is required for the
    complete Tube & rail set.
    {state.id ? ` Current selection: ${state.id}.` : null}
  </p>
);
