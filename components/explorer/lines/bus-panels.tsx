"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LineInspector } from "@/components/explorer/entity-inspector/line-inspector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useExplorerKeyedQuery } from "@/hooks/use-explorer-keyed-query";
import {
  buildExplorerHref,
  type ExplorerState,
} from "@/lib/tfl/explorer-url-state";
import type {
  ExplorerLineRoute,
  ExplorerLineSummary,
} from "@/lib/tfl/explorer/common";
import { cn } from "@/lib/utils";

type LinesBusBrowseProps = {
  state: ExplorerState;
  lines: readonly ExplorerLineSummary[];
  route?: ExplorerLineRoute | null;
};

export const LinesBusBrowse = ({
  state,
  lines,
  route,
}: LinesBusBrowseProps) => {
  const router = useRouter();
  const selected =
    lines.find((line) => line.id === state.id) ??
    (state.id
      ? ({ id: state.id, name: state.id, modeName: "bus" } as ExplorerLineSummary)
      : null);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground text-pretty">
          Curated central London bus routes. A complete London directory is too
          large for a free cached Browse list — use Find with your TfL API key
          for arbitrary route numbers.
        </p>
        <ul className="grid gap-2 sm:grid-cols-2" role="list">
          {lines.map((line) => {
            const isSelected = line.id === selected?.id;
            return (
              <li key={line.id}>
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      buildExplorerHref({ id: line.id, dir: state.dir }, state),
                      { scroll: false },
                    )
                  }
                  className={cn(
                    "w-full rounded-lg border border-border bg-card p-3 text-left transition-colors hover:bg-muted/50",
                    isSelected && "ring-1 ring-primary",
                  )}
                >
                  <span className="font-semibold">{line.name}</span>
                  <code className="mt-1 block text-xs text-muted-foreground">
                    {line.id}
                  </code>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        {selected ? (
          <LineInspector
            line={selected}
            route={route}
            direction={state.dir}
            domain="bus"
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Select a bus route to inspect ordered stops.
          </p>
        )}
      </div>
    </div>
  );
};

type LinesBusFindProps = {
  state: ExplorerState;
};

export const LinesBusFind = ({ state }: LinesBusFindProps) => {
  const router = useRouter();
  const { loading, error, runKeyed } = useExplorerKeyedQuery();
  const [query, setQuery] = useState(state.q ?? "");
  const [line, setLine] = useState<ExplorerLineSummary | null>(
    state.id
      ? { id: state.id, name: state.id, modeName: "bus" }
      : null,
  );
  const [route, setRoute] = useState<ExplorerLineRoute | null>(null);

  const handleLookup = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return;

    const result = await runKeyed(async (client) => {
      const lines = await client.line.get({ lineIds: [trimmed] });
      const found = lines[0];
      if (!found?.id) {
        throw new Error(`No bus line found for “${trimmed}”.`);
      }
      const sequence = await client.line.getRouteSequence({
        id: found.id,
        direction: state.dir,
      });
      return {
        line: {
          id: found.id,
          name: found.name ?? found.id,
          modeName: found.modeName ?? "bus",
        } satisfies ExplorerLineSummary,
        route: {
          line: {
            id: found.id,
            name: found.name,
            modeName: found.modeName,
          },
          stops:
            sequence.stopPointSequences?.flatMap(
              (seq) => seq.stopPoint ?? [],
            ) ?? [],
        } satisfies ExplorerLineRoute,
      };
    });

    if (result.ok) {
      setLine(result.data.line);
      setRoute(result.data.route);
      router.push(
        buildExplorerHref({ id: result.data.line.id, q: trimmed }, state),
        { scroll: false },
      );
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <form onSubmit={handleLookup} className="space-y-3" role="search">
        <div className="space-y-1">
          <Label htmlFor="bus-line-lookup">Bus route number</Label>
          <Input
            id="bus-line-lookup"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="e.g. 73"
            autoComplete="off"
          />
        </div>
        <Button type="submit" disabled={loading || query.trim().length === 0}>
          {loading ? "Looking up…" : "Look up line"}
        </Button>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <p className="text-sm text-muted-foreground text-pretty">
          Arbitrary bus line lookup uses your TfL API key and calls{" "}
          <code className="text-xs">line.get</code> +{" "}
          <code className="text-xs">line.getRouteSequence</code> directly.
        </p>
      </form>

      <div>
        {line ? (
          <LineInspector
            line={line}
            route={route}
            direction={state.dir}
            domain="bus"
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Enter a route number to inspect it.
          </p>
        )}
      </div>
    </div>
  );
};
