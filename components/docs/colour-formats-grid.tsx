"use client";

import { useState, type ReactNode } from "react";
import { LineColorBar } from "@/components/tfl/brand/line-badge";
import type { BrandColourSpec } from "@/lib/tfl/brand-colours";
import { brandColourTableRow } from "@/lib/tfl/colour-formats";
import { GO_NIGHT_PAPER } from "@/lib/tfl/dark-line-colours";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type ColourFormatsGridLine = {
  id: string;
  name: string;
  modeName: string;
  spec: BrandColourSpec;
};

type ScreenFormat = "hex" | "oklch";

type ColourFormatsGridProps = {
  lines: ColourFormatsGridLine[];
  className?: string;
};

const barHeightClass = (modeName?: string) => {
  if (modeName === "cable-car") return "h-[5px]";
  if (modeName === "overground" || modeName === "elizabeth-line") {
    return "h-[5px]";
  }
  return "h-[3px]";
};

const CopyButton = ({
  label,
  value,
  className,
  children,
}: {
  label: string;
  value: string;
  className?: string;
  children: ReactNode;
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
    <button
      type="button"
      onClick={() => void handleCopy()}
      title={value}
      aria-label={copied ? `Copied ${label}` : `Copy ${label}: ${value}`}
      className={cn(
        "relative w-full min-w-0 text-left transition-colors hover:bg-muted/50",
        className,
      )}
    >
      {children}
      {copied ? (
        <span
          aria-live="polite"
          className="pointer-events-none absolute inset-x-1 top-1/2 z-20 -translate-y-1/2 rounded-md border border-border bg-popover px-2 py-0.5 text-center font-sans text-[11px] font-medium text-popover-foreground shadow-sm"
        >
          Copied
        </span>
      ) : null}
    </button>
  );
};

const ColourCard = ({
  line,
  format,
}: {
  line: ColourFormatsGridLine;
  format: ScreenFormat;
}) => {
  const row = brandColourTableRow(line.spec, { lineId: line.id });
  const light =
    format === "hex"
      ? row.screen.find((c) => c.key === "hex-light")!
      : row.screen.find((c) => c.key === "oklch-light")!;
  const dark =
    format === "hex"
      ? row.screen.find((c) => c.key === "hex-dark")!
      : row.screen.find((c) => c.key === "oklch-dark")!;

  return (
    <article className="flex min-w-0 flex-col gap-2 border-b border-border pb-3">
      <div className="space-y-1.5">
        <h3 className="text-sm font-medium text-foreground">{line.name}</h3>
        <LineColorBar
          lineId={line.id}
          modeName={line.modeName}
          color={line.spec.hex}
          heightClass={barHeightClass(line.modeName)}
        />
      </div>

      <div className="grid gap-1">
        <CopyButton
          label={`${line.name} light ${format}`}
          value={light.value}
          className="rounded-md px-2 py-1.5"
        >
          <span className="flex flex-col gap-0.5">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Light
            </span>
            <span className="font-mono text-[11px] leading-snug break-all text-foreground">
              {light.value}
            </span>
          </span>
        </CopyButton>

        <CopyButton
          label={`${line.name} dark ${format}`}
          value={dark.value}
          className="rounded-md px-2 py-1.5"
        >
          <span
            className="flex flex-col gap-0.5 rounded-sm px-1.5 py-1"
            style={{ backgroundColor: GO_NIGHT_PAPER }}
          >
            <span className="text-[10px] font-medium uppercase tracking-wide text-white/55">
              Dark
            </span>
            <span className="font-mono text-[11px] leading-snug break-all text-white/90">
              {dark.value}
            </span>
          </span>
        </CopyButton>

        <CopyButton
          label={`${line.name} print`}
          value={row.print.value}
          className="rounded-md px-2 py-1.5"
        >
          <span className="flex flex-col gap-0.5">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Print
            </span>
            <span className="flex flex-col gap-0.5 font-mono text-[11px] leading-snug text-foreground">
              {row.print.lines.map((lineText) => (
                <span key={lineText} className="break-all">
                  {lineText}
                </span>
              ))}
            </span>
          </span>
        </CopyButton>
      </div>
    </article>
  );
};

/**
 * Colour gallery: one format select (HEX | OKLCH), grid of tap-to-copy cards.
 * Print (CMYK · Pantone · NCS) is always shown.
 */
export const ColourFormatsGrid = ({
  lines,
  className,
}: ColourFormatsGridProps) => {
  const [format, setFormat] = useState<ScreenFormat>("hex");

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-center gap-3">
        <label
          htmlFor="colour-format-select"
          className="text-sm text-muted-foreground"
        >
          Screen format
        </label>
        <Select
          value={format}
          onValueChange={(value) => {
            if (value === "hex" || value === "oklch") setFormat(value);
          }}
        >
          <SelectTrigger
            id="colour-format-select"
            size="sm"
            className="min-w-28"
            aria-label="Screen colour format"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hex">HEX</SelectItem>
            <SelectItem value="oklch">OKLCH</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Tap a value to copy. Print stays visible.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {lines.map((line) => (
          <ColourCard key={line.id} line={line} format={format} />
        ))}
      </div>
    </div>
  );
};
