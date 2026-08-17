"use client";

import {
  useState,
  type ClipboardEvent,
  type CSSProperties,
} from "react";
import { DocsResizeFrame } from "@/components/docs/docs-resize-frame";
import { PlatformChip } from "@/components/tfl/arrivals/platform-chip";
import { StationName } from "@/components/tfl/station-name";
import { TFL_BLUE } from "@/lib/tfl/brand";
import { STATION_ABBREVIATION_TABLE } from "@/lib/tfl/station-abbreviations";
import { cn } from "@/lib/utils";

const WIDTH_DEMO_NAME = "London Liverpool Street";
const COPY_NAME = "London Liverpool Street";
const LABEL_FONT_SIZE = 16;

const WIDTH_STEPS = [320, 220, 160, 120, 88] as const;

const ABBREVIATION_SAMPLES = [
  { name: "London Liverpool Street", due: "2 min" },
  { name: "Tottenham Court Road", due: "4 min" },
  { name: "Highbury & Islington", due: "Due" },
  { name: "Clapham Junction", due: "7 min" },
] as const;

/** Same rhythm as arrivals boards — one row = 6 × 0.5rem, fits two leading-5 lines. */
const ARRIVALS_RHYTHM = {
  "--arrivals-unit": "0.5rem",
  "--arrivals-row": "calc(var(--arrivals-unit) * 6)",
} as CSSProperties;

const ARRIVALS_TILE =
  "box-border h-[var(--arrivals-row)] min-h-[var(--arrivals-row)] max-h-[var(--arrivals-row)] shrink-0 overflow-clip";

const ARRIVALS_ROW_RULE =
  "relative after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-border/60";

export const StationWidthDemo = () => (
  <ul className="flex flex-col gap-6">
    {WIDTH_STEPS.map((width) => (
      <li key={width} className="flex items-center gap-3">
        <div
          className="relative flex shrink-0 items-center justify-center py-2.5 text-white"
          style={{ width, backgroundColor: TFL_BLUE }}
        >
          <StationName
            name={WIDTH_DEMO_NAME}
            layout="auto"
            maxWidth={width}
            fontSize={LABEL_FONT_SIZE}
            maxLines={2}
            allowAbbreviation
            allowScaleDown
            align="center"
            className="font-medium text-white"
          />
        </div>
        <span className="text-xs tabular-nums text-muted-foreground">
          {width}px
        </span>
      </li>
    ))}
  </ul>
);

export const AbbreviationDemo = () => (
  <div className="space-y-5">
    <table className="w-auto text-left text-sm">
      <thead>
        <tr className="border-b border-border text-muted-foreground">
          <th className="py-1.5 pr-6 font-medium">Full</th>
          <th className="py-1.5 pr-6 font-medium">Short</th>
          <th className="py-1.5 pr-6 font-medium tabular-nums">Stations</th>
          <th className="py-1.5 font-medium">Examples</th>
        </tr>
      </thead>
      <tbody>
        {STATION_ABBREVIATION_TABLE.map((row) => (
          <tr key={row.short} className="border-b border-border/60">
            <td className="py-1.5 pr-6 text-foreground">{row.full}</td>
            <td className="py-1.5 pr-6 font-medium text-foreground">
              {row.short}
            </td>
            <td className="py-1.5 pr-6 tabular-nums text-foreground">
              {row.count}
            </td>
            <td className="py-1.5 text-muted-foreground">
              {row.examples.join(" · ")}
            </td>
          </tr>
        ))}
      </tbody>
    </table>

    <ArrivalsResizeDemo />
  </div>
);

export const ArrivalsResizeDemo = () => (
  <DocsResizeFrame
    defaultWidth={288}
    minWidth={120}
    className="@container/arrivals min-w-30"
    style={ARRIVALS_RHYTHM}
    captionSuffix=" · resize to see it in action"
  >
    <ul>
      {ABBREVIATION_SAMPLES.map((row, index) => (
        <li
          key={row.name}
          className={cn(
            "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 px-2 text-sm",
            ARRIVALS_TILE,
            index < ABBREVIATION_SAMPLES.length - 1 && ARRIVALS_ROW_RULE,
          )}
        >
          <PlatformChip number="4" />
          <div className="min-w-0">
            <StationName
              name={row.name}
              layout="auto"
              maxLines={2}
              allowAbbreviation
              allowScaleDown
              className="font-medium text-foreground"
            />
          </div>
          <span className="shrink-0 font-semibold tabular-nums text-foreground">
            {row.due}
          </span>
        </li>
      ))}
    </ul>
  </DocsResizeFrame>
);

const COPY_FIND_WIDTH = 88;

export const CopyFindDemo = () => {
  const [lastCopy, setLastCopy] = useState<string | null>(null);

  const handleCopy = (event: ClipboardEvent<HTMLDivElement>) => {
    const text = event.clipboardData.getData("text/plain") || COPY_NAME;
    setLastCopy(text);
  };

  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
      <div className="flex shrink-0 items-center gap-3" onCopy={handleCopy}>
        <div
          className="relative flex items-center justify-center py-2.5 text-white"
          style={{ width: COPY_FIND_WIDTH, backgroundColor: TFL_BLUE }}
        >
          <StationName
            name={COPY_NAME}
            layout="auto"
            maxWidth={COPY_FIND_WIDTH}
            fontSize={LABEL_FONT_SIZE}
            maxLines={2}
            allowAbbreviation
            allowScaleDown
            align="center"
            className="font-medium text-white"
          />
        </div>
        <span className="text-xs tabular-nums text-muted-foreground">
          {COPY_FIND_WIDTH}px
        </span>
      </div>

      <dl className="min-w-0 max-w-prose flex-1 space-y-4">
        <div className="space-y-1">
          <dt className="text-sm font-medium text-foreground">Copy</dt>
          <dd className="text-sm text-muted-foreground">
            Select the label and copy. Clipboard gets{" "}
            <code className="text-xs text-foreground">{COPY_NAME}</code>
            {lastCopy ? (
              <>
                {" "}
                · last:{" "}
                <code className="text-xs text-foreground">{lastCopy}</code>
              </>
            ) : null}
            .
          </dd>
        </div>
        <div className="space-y-1">
          <dt className="text-sm font-medium text-foreground">Find</dt>
          <dd className="text-sm text-muted-foreground">
            Cmd/Ctrl+F &quot;London Liverpool Street&quot;. Wrapped labels use{" "}
            <code className="text-xs text-foreground">hidden=&quot;until-found&quot;</code>{" "}
            so find reveals the full name under the paint.
          </dd>
        </div>
        <div className="space-y-1">
          <dt className="text-sm font-medium text-foreground">Screen reader</dt>
          <dd className="text-sm text-muted-foreground">
            Painted lines are <code className="text-xs">aria-hidden</code>.
            Announced name:{" "}
            <code className="text-xs text-foreground">{COPY_NAME}</code>.
          </dd>
        </div>
      </dl>
    </div>
  );
};
