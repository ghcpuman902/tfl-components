"use client";

/**
 * TfLPointPicker — controlled, props-only point search / browse UI.
 *
 * Owns:
 * - search input UI (explicit Search / Enter submission)
 * - locate action UI
 * - filters slot
 * - loading / empty / error states
 * - list / map view switching
 * - keyboard navigation
 * - result selection
 * - accessible labels and focus behaviour
 * - responsive layout
 *
 * Does NOT own:
 * - credentials
 * - tfl-ts client creation
 * - Server Actions
 * - browser storage
 * - data fetching
 * - key policy
 * - a hard dependency on MapLibre
 *
 * Site-owned for now — not published to the registry.
 */

import {
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { List, Loader2, LocateFixed, Map as MapIcon, Search } from "lucide-react";
import {
  explorerPaneClassName,
  explorerPaneItemClassName,
} from "@/components/explorer/explorer-split";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { cn } from "@/lib/utils";
import type { ExplorerPoint } from "@/lib/tfl/explorer-point-normalise";
import type { ExplorerView } from "@/lib/tfl/explorer-url-state";

export type TfLPointPickerMapRenderProps = {
  points: readonly ExplorerPoint[];
  selectedId?: string | null;
  onSelect: (point: ExplorerPoint) => void;
  className?: string;
};

export type TfLPointPickerProps = {
  points: readonly ExplorerPoint[];
  selectedId?: string | null;
  onSelect: (point: ExplorerPoint) => void;
  /** Fires only on Search click or Enter — typing never spends quota. */
  onSearchSubmit: (query: string) => void;
  /** Omit to hide the locate button entirely. */
  onLocate?: () => void;
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  view: ExplorerView;
  onViewChange: (view: ExplorerView) => void;
  renderMap?: (props: TfLPointPickerMapRenderProps) => ReactNode;
  filters?: ReactNode;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchValueChange?: (value: string) => void;
  className?: string;
};

const formatDistance = (meters?: number): string => {
  if (meters === undefined) return "";
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
};

const SEARCH_INPUT_CLASS =
  "appearance-none [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden";

type PointResultOptionProps = {
  point: ExplorerPoint;
  selected: boolean;
  active: boolean;
  onSelect: (point: ExplorerPoint) => void;
};

const PointResultOption = ({
  point,
  selected,
  active,
  onSelect,
}: PointResultOptionProps) => {
  const meta = [
    point.stopLetter ? `Stop ${point.stopLetter}` : null,
    point.towards ? `towards ${point.towards}` : null,
    point.distanceMeters !== undefined
      ? formatDistance(point.distanceMeters)
      : null,
    point.bikes !== undefined ? `${point.bikes} bikes` : null,
  ].filter(Boolean);

  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      tabIndex={active ? 0 : -1}
      onClick={() => onSelect(point)}
      className={cn(
        "flex w-full flex-col gap-0.5 px-3 py-2 text-left text-sm transition-colors",
        "[content-visibility:auto] [contain-intrinsic-size:auto_3.25rem]",
        explorerPaneItemClassName,
        "hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
        selected && "bg-muted ring-1 ring-inset ring-primary",
        active && !selected && "bg-muted/40",
      )}
    >
      <span className="flex min-w-0 items-baseline gap-2">
        <span className="truncate font-medium">{point.name}</span>
        <code className="ml-auto shrink-0 text-xs text-muted-foreground">
          {point.id}
        </code>
      </span>
      {meta.length > 0 ? (
        <span className="text-xs text-muted-foreground">{meta.join(" · ")}</span>
      ) : null}
    </button>
  );
};

export const TfLPointPicker = ({
  points,
  selectedId,
  onSelect,
  onSearchSubmit,
  onLocate,
  loading = false,
  error = null,
  emptyMessage = "No points to show.",
  view,
  onViewChange,
  renderMap,
  filters,
  searchPlaceholder = "Search by name or ID",
  searchValue,
  onSearchValueChange,
  className,
}: TfLPointPickerProps) => {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [internalQuery, setInternalQuery] = useState("");

  const query = searchValue ?? internalQuery;
  const setQuery = onSearchValueChange ?? setInternalQuery;

  const selectedIndex = points.findIndex((point) => point.id === selectedId);
  const [activeIndex, setActiveIndex] = useState(
    selectedIndex >= 0 ? selectedIndex : 0,
  );
  const resolvedActiveIndex =
    selectedIndex >= 0
      ? selectedIndex
      : Math.min(activeIndex, Math.max(points.length - 1, 0));

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSearchSubmit(query);
  };

  const handleListKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    if (points.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => {
        const base = selectedIndex >= 0 ? selectedIndex : current;
        return (base + 1) % points.length;
      });
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => {
        const base = selectedIndex >= 0 ? selectedIndex : current;
        return (base - 1 + points.length) % points.length;
      });
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const point = points[resolvedActiveIndex];
      if (point) onSelect(point);
    }
  };

  const showMap = view === "map" && renderMap;

  return (
    <div className={cn("flex h-full min-h-0 flex-col gap-3", className)}>
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-2 sm:h-9 sm:flex-row sm:items-stretch"
        role="search"
      >
        <InputGroup className="h-9 min-w-0 flex-1">
          <InputGroupAddon align="inline-start">
            <Search className="size-4" aria-hidden />
          </InputGroupAddon>
          <InputGroupInput
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            aria-controls={listId}
            disabled={loading}
            autoComplete="off"
            className={SEARCH_INPUT_CLASS}
          />
          {onLocate ? (
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                type="button"
                size="icon-xs"
                aria-label="Use my location"
                disabled={loading}
                onClick={onLocate}
                className="h-full w-8 rounded-[calc(var(--radius-lg)-2px)]"
              >
                <LocateFixed className="size-4" aria-hidden />
              </InputGroupButton>
            </InputGroupAddon>
          ) : null}
        </InputGroup>

        <div className="flex h-9 shrink-0 items-stretch gap-2">
          <Button type="submit" size="lg" disabled={loading} aria-busy={loading}>
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Searching…
              </>
            ) : (
              "Search"
            )}
          </Button>

          {renderMap ? (
            <div
              className="inline-flex h-9 items-stretch rounded-lg border border-border p-0.5"
              role="group"
              aria-label="Results view"
            >
              <Button
                type="button"
                size="sm"
                variant={view === "list" ? "secondary" : "ghost"}
                aria-pressed={view === "list"}
                className="h-full rounded-[calc(var(--radius-lg)-2px)]"
                onClick={() => onViewChange("list")}
              >
                <List className="size-4" aria-hidden />
                <span className="sr-only sm:not-sr-only">List</span>
              </Button>
              <Button
                type="button"
                size="sm"
                variant={view === "map" ? "secondary" : "ghost"}
                aria-pressed={view === "map"}
                className="h-full rounded-[calc(var(--radius-lg)-2px)]"
                onClick={() => onViewChange("map")}
              >
                <MapIcon className="size-4" aria-hidden />
                <span className="sr-only sm:not-sr-only">Map</span>
              </Button>
            </div>
          ) : null}
        </div>
      </form>

      {filters ? <div className="space-y-2">{filters}</div> : null}

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div
        className="h-112 min-h-0 lg:h-auto lg:min-h-0 lg:flex-1"
        aria-live="polite"
        aria-busy={loading}
      >
        {showMap ? (
          renderMap({
            points,
            selectedId,
            onSelect,
            className: cn(explorerPaneClassName, "h-full min-h-0"),
          })
        ) : points.length === 0 && !loading ? (
          <div
            className={cn(
              explorerPaneClassName,
              "flex h-full items-center p-4",
            )}
          >
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          </div>
        ) : (
          <ul
            id={listId}
            role="listbox"
            aria-label="Point results"
            tabIndex={0}
            onKeyDown={handleListKeyDown}
            className={cn(
              explorerPaneClassName,
              "h-full space-y-1 overflow-y-auto overscroll-contain p-1 scrollbar-thin",
            )}
          >
            {points.map((point, index) => (
              <PointResultOption
                key={point.id}
                point={point}
                selected={point.id === selectedId}
                active={index === resolvedActiveIndex}
                onSelect={onSelect}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
