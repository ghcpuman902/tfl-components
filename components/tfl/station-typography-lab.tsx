"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { StationNameLabel } from "@/components/tfl/station-name-label";
import { TFL_BLUE } from "@/lib/tfl/brand-colours";
import type { CatalogStation } from "@/lib/tfl/station-catalog";
import type { StationLabelFormatResult } from "@/lib/tfl/station-typography";
import { cn } from "@/lib/utils";

export type StationTypographyLabProps = {
  stations: CatalogStation[];
};

type CardDiagnostics = Record<string, StationLabelFormatResult>;

const letterOf = (name: string): string => {
  const ch = name.trim().charAt(0).toUpperCase();
  return /[A-Z]/.test(ch) ? ch : "#";
};

/** Normalize for search: straight/curly apostrophes, case. */
const normalizeSearch = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[\u2018\u2019\u02BC\u0060]/g, "'")
    .normalize("NFD")
    .replace(/\p{M}/gu, "");

/**
 * Interactive A–Z typography lab: measure Hammersmith One, balance two-line
 * station names, and inspect abbreviation / scale fallbacks.
 */
export const StationTypographyLab = ({ stations }: StationTypographyLabProps) => {
  const [query, setQuery] = useState("");
  const [boxWidth, setBoxWidth] = useState(168);
  const [fontSize, setFontSize] = useState(16);
  const [maxLines, setMaxLines] = useState<1 | 2>(2);
  const [allowAbbreviation, setAllowAbbreviation] = useState(false);
  const [allowScaleDown, setAllowScaleDown] = useState(true);
  const [diagnostics, setDiagnostics] = useState<CardDiagnostics>({});

  const filtered = useMemo(() => {
    const q = normalizeSearch(query.trim());
    if (!q) return stations;
    return stations.filter((s) => {
      const haystack = normalizeSearch(
        `${s.displayName} ${s.name} ${s.lines.join(" ")} ${s.modes.join(" ")}`,
      );
      return haystack.includes(q);
    });
  }, [query, stations]);

  const grouped = useMemo(() => {
    const map = new Map<string, CatalogStation[]>();
    for (const station of filtered) {
      const letter = letterOf(station.displayName);
      const list = map.get(letter) ?? [];
      list.push(station);
      map.set(letter, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const handleFormat = (id: string, result: StationLabelFormatResult) => {
    setDiagnostics((prev) => {
      const prevResult = prev[id];
      if (
        prevResult &&
        prevResult.lines.join("|") === result.lines.join("|") &&
        prevResult.scale === result.scale &&
        prevResult.abbreviated === result.abbreviated &&
        prevResult.fits === result.fits
      ) {
        return prev;
      }
      return { ...prev, [id]: result };
    });
  };

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-lg border border-border bg-card p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <Label htmlFor="station-search">Search stations</Label>
            <Input
              id="station-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="King's Cross, Highbury, victoria…"
              aria-label="Filter station names"
            />
          </div>
          <p className="text-sm text-muted-foreground tabular-nums">
            {filtered.length} of {stations.length} stations
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="box-width">Box width</Label>
              <span className="text-xs tabular-nums text-muted-foreground">
                {boxWidth}px
              </span>
            </div>
            <Slider
              id="box-width"
              min={96}
              max={280}
              step={4}
              value={[boxWidth]}
              onValueChange={(value) => {
                const next = Array.isArray(value) ? value[0] : value;
                if (typeof next === "number") setBoxWidth(next);
              }}
              aria-label="Destination box width"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="font-size">Font size</Label>
              <span className="text-xs tabular-nums text-muted-foreground">
                {fontSize}px
              </span>
            </div>
            <Slider
              id="font-size"
              min={12}
              max={28}
              step={1}
              value={[fontSize]}
              onValueChange={(value) => {
                const next = Array.isArray(value) ? value[0] : value;
                if (typeof next === "number") setFontSize(next);
              }}
              aria-label="Station name font size"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="max-lines">Allow two lines</Label>
              <Switch
                id="max-lines"
                checked={maxLines === 2}
                onCheckedChange={(checked) => setMaxLines(checked ? 2 : 1)}
                aria-label="Allow two-line station names"
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="allow-abbr">Allow abbreviations</Label>
              <Switch
                id="allow-abbr"
                checked={allowAbbreviation}
                onCheckedChange={setAllowAbbreviation}
                aria-label="Allow TfL-style abbreviations when needed"
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="allow-scale">Fit-to-box scale-down</Label>
              <Switch
                id="allow-scale"
                checked={allowScaleDown}
                onCheckedChange={setAllowScaleDown}
                aria-label="Allow shrinking type to fit the box"
              />
            </div>
          </div>
        </div>
      </section>

      {grouped.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No stations match that search.
        </p>
      ) : (
        grouped.map(([letter, letterStations]) => (
          <section key={letter} className="space-y-3">
            <h2 className="sticky top-12 z-10 -mx-1 bg-background/90 px-1 py-1 text-lg font-semibold backdrop-blur">
              {letter}
              <span className="ml-2 text-sm font-normal text-muted-foreground tabular-nums">
                {letterStations.length}
              </span>
            </h2>
            <ul
              className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
              role="list"
            >
              {letterStations.map((station) => {
                const diag = diagnostics[station.id];
                return (
                  <li
                    key={station.id}
                    className="rounded-lg border border-border bg-card p-3"
                  >
                    <div
                      className="mx-auto flex items-center justify-center px-2.5 py-2"
                      style={{
                        width: boxWidth,
                        maxWidth: "100%",
                        backgroundColor: TFL_BLUE,
                        color: "#fff",
                        minHeight: fontSize * (maxLines === 2 ? 2.5 : 1.5),
                      }}
                    >
                      <StationNameLabel
                        name={station.displayName}
                        maxWidth={boxWidth - 20}
                        fontSize={fontSize}
                        maxLines={maxLines}
                        allowAbbreviation={allowAbbreviation}
                        allowScaleDown={allowScaleDown}
                        align="center"
                        className="font-medium text-white"
                        style={{ color: "#fff" }}
                        onFormat={(result) =>
                          handleFormat(station.id, result)
                        }
                      />
                    </div>
                    <p className="mt-2 truncate text-xs text-muted-foreground">
                      {station.modes.join(" · ")}
                      {station.lines.length > 0
                        ? ` · ${station.lines.slice(0, 3).join(", ")}`
                        : ""}
                      {station.lines.length > 3 ? "…" : ""}
                    </p>
                    {diag ? (
                      <p
                        className={cn(
                          "mt-1 text-[11px] leading-snug text-muted-foreground",
                          !diag.fits && "text-destructive",
                        )}
                      >
                        {diag.lines.length} line
                        {diag.lines.length === 1 ? "" : "s"}
                        {" · "}
                        scale {diag.scale.toFixed(2)}
                        {diag.abbreviated ? " · abbreviated" : ""}
                        {!diag.fits ? " · overflow" : ""}
                        {" · "}
                        <span className="font-mono">
                          {diag.lines.join(" / ")}
                        </span>
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
};
