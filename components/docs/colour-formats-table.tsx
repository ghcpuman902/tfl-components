"use client";

import { useState, type ReactNode } from "react";
import { LineColorBar } from "@/components/tfl/brand/line-badge";
import type { BrandColourSpec } from "@/lib/tfl/brand-colours";
import { brandColourTableRow } from "@/lib/tfl/colour-formats";
import { GO_NIGHT_PAPER } from "@/lib/tfl/dark-line-colours";
import { cn } from "@/lib/utils";

export type ColourFormatsTableLine = {
  id: string;
  name: string;
  modeName: string;
  spec: BrandColourSpec;
};

type ColourFormatsTableProps = {
  lines: ColourFormatsTableLine[];
  className?: string;
};

/** Tall enough that parallel / cable-car rails stay legible at table scale. */
const barHeightClass = (modeName?: string) => {
  if (modeName === "cable-car") return "h-[5px]";
  if (modeName === "overground" || modeName === "elizabeth-line") {
    return "h-[5px]";
  }
  return "h-[3px]";
};

const SolidSwatch = ({
  cssColor,
  cssFallback,
  nightPaper,
}: {
  cssColor: string;
  cssFallback?: string;
  nightPaper?: boolean;
}) => {
  const fallback = cssFallback ?? cssColor;
  if (nightPaper) {
    return (
      <span
        aria-hidden
        className="flex h-6 w-full shrink-0 items-center"
        style={{ backgroundColor: GO_NIGHT_PAPER }}
      >
        <span
          className="block h-[3px] w-full"
          style={{ backgroundColor: cssColor }}
        />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className="block h-[3px] w-full shrink-0"
      style={{ backgroundColor: fallback }}
    >
      <span
        className="block h-full w-full"
        style={{ backgroundColor: cssColor }}
      />
    </span>
  );
};

const SwatchCell = ({
  label,
  value,
  cssColor,
  cssFallback,
  sticky,
  className,
  children,
  swatch,
  nightPaper,
}: {
  label: string;
  value: string;
  cssColor: string;
  cssFallback?: string;
  sticky?: boolean;
  className?: string;
  children?: ReactNode;
  /** Override underside (e.g. LineColorBar for map-style rails). */
  swatch?: ReactNode;
  nightPaper?: boolean;
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1100);
    } catch {
      /* ignore */
    }
  };

  return (
    <td
      className={cn(
        "p-0 align-bottom",
        sticky && "sticky left-0 z-10 bg-background",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => void handleCopy()}
        title={value}
        aria-label={copied ? `Copied ${label}` : `Copy ${label}: ${value}`}
        className={cn(
          "relative flex w-full min-w-0 flex-col text-left transition-colors hover:bg-muted/40",
          nightPaper && "hover:bg-transparent",
        )}
        style={
          nightPaper
            ? { backgroundColor: GO_NIGHT_PAPER }
            : undefined
        }
      >
        <span className="px-2 py-2">
          {children ?? (
            <span
              className={cn(
                "font-mono text-[12px] leading-snug whitespace-nowrap",
                nightPaper ? "text-white/80" : "text-foreground",
              )}
            >
              {value}
            </span>
          )}
        </span>
        {swatch ?? (
          <SolidSwatch
            cssColor={cssColor}
            cssFallback={cssFallback}
            nightPaper={nightPaper}
          />
        )}
        {copied ? (
          <span
            aria-live="polite"
            className="pointer-events-none absolute inset-x-1 top-1/2 z-20 -translate-y-1/2 rounded-md border border-border bg-popover px-2 py-0.5 text-center font-sans text-[11px] font-medium text-popover-foreground shadow-sm"
          >
            Copied
          </span>
        ) : null}
      </button>
    </td>
  );
};

/**
 * Colour-format table: light + dark OKLCH/hex, print last.
 * Dark columns sit on charcoal paper. Narrow viewports scroll horizontally.
 */
export const ColourFormatsTable = ({
  lines,
  className,
}: ColourFormatsTableProps) => (
  <div
    className={cn(
      "overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]",
      className,
    )}
  >
    <table className="w-max border-separate border-spacing-0 text-left">
      <thead>
        <tr className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          <th className="sticky left-0 z-10 bg-background px-2 py-1.5 text-left font-medium whitespace-nowrap">
            Line
          </th>
          <th className="px-2 py-1.5 text-left font-medium whitespace-nowrap">
            OKLCH
          </th>
          <th className="px-2 py-1.5 text-left font-medium whitespace-nowrap">
            HEX
          </th>
          <th className="px-2 py-1.5 text-left font-medium whitespace-nowrap">
            OKLCH dark
          </th>
          <th className="px-2 py-1.5 text-left font-medium whitespace-nowrap">
            HEX dark
          </th>
          <th className="px-2 py-1.5 text-left font-medium whitespace-nowrap">
            Print
            <span className="ml-1 font-normal normal-case tracking-normal text-muted-foreground/80">
              (CMYK · Pantone · NCS)
            </span>
          </th>
        </tr>
      </thead>
      <tbody>
        {lines.map((line) => {
          const row = brandColourTableRow(line.spec, { lineId: line.id });
          return (
            <tr key={line.id}>
              <SwatchCell
                label="Line"
                value={line.name}
                cssColor={line.spec.hex}
                sticky
                swatch={
                  <LineColorBar
                    lineId={line.id}
                    modeName={line.modeName}
                    color={line.spec.hex}
                    heightClass={barHeightClass(line.modeName)}
                  />
                }
              >
                <span className="text-[12px] leading-snug font-medium whitespace-nowrap text-foreground">
                  {line.name}
                </span>
              </SwatchCell>
              {row.screen.map((col) => (
                <SwatchCell
                  key={col.key}
                  label={col.label}
                  value={col.value}
                  cssColor={col.cssColor}
                  nightPaper={col.nightPaper}
                />
              ))}
              <SwatchCell
                label="Print"
                value={row.print.value}
                cssColor={row.print.cssColor}
                cssFallback={row.print.cssFallback}
              >
                <span className="flex flex-col gap-0.5 font-mono text-[12px] leading-snug whitespace-nowrap text-foreground">
                  {row.print.lines.map((lineText) => (
                    <span key={lineText}>{lineText}</span>
                  ))}
                </span>
              </SwatchCell>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);
