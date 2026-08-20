"use client"

import { useState, type CSSProperties, type ReactNode } from "react"
import { LineColorBar } from "@/components/tfl/brand/line-badge"
import type { BrandColourSpec } from "@/lib/tfl/brand-colours"
import { brandColourTableRow } from "@/lib/tfl/colour-formats"
import { GO_NIGHT_PAPER } from "@/lib/tfl/dark-line-colours"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type ColourFormatsGridLine = {
  id: string
  name: string
  modeName: string
  spec: BrandColourSpec
}

type ScreenFormat = "hex" | "oklch"

type ColourFormatsGridProps = {
  lines: ColourFormatsGridLine[]
  className?: string
  /** Optional section heading rendered left of the format select. */
  title?: string
  titleId?: string
}

type CopyTone = "light" | "dark" | "print"

const CopyButton = ({
  label,
  value,
  tone = "print",
  className,
  style,
  children,
}: {
  label: string
  value: string
  tone?: CopyTone
  className?: string
  style?: CSSProperties
  children: ReactNode
}) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    } catch {
      /* ignore */
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      title={value}
      aria-label={copied ? `Copied ${label}` : `Copy ${label}: ${value}`}
      className={cn(
        "group/copy relative w-full min-w-0 cursor-pointer overflow-hidden text-left",
        "focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        tone === "print" && "rounded-md transition-colors hover:bg-muted",
        className
      )}
      style={style}
    >
      {children}
      {tone !== "print" && !copied ? (
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 transition-colors",
            tone === "light" && "group-hover/copy:bg-black/6",
            tone === "dark" && "group-hover/copy:bg-white/12"
          )}
        />
      ) : null}
      {copied ? (
        <span
          aria-live="polite"
          className={cn(
            "pointer-events-none absolute inset-0 z-20 flex items-center justify-center text-sm font-medium",
            tone === "light" && "bg-white/95 text-black",
            tone === "dark" && "text-white",
            tone === "print" &&
              "rounded-md border border-border bg-popover text-popover-foreground"
          )}
          style={
            tone === "dark" ? { backgroundColor: GO_NIGHT_PAPER } : undefined
          }
        >
          Copied
        </span>
      ) : null}
    </button>
  )
}

const ColourCard = ({
  line,
  format,
}: {
  line: ColourFormatsGridLine
  format: ScreenFormat
}) => {
  const row = brandColourTableRow(line.spec, { lineId: line.id })
  const light =
    format === "hex"
      ? row.screen.find((c) => c.key === "hex-light")!
      : row.screen.find((c) => c.key === "oklch-light")!
  const dark =
    format === "hex"
      ? row.screen.find((c) => c.key === "hex-dark")!
      : row.screen.find((c) => c.key === "oklch-dark")!

  return (
    <article className="flex min-w-0 flex-col gap-2 border-b border-border pb-3">
      <div className="space-y-1.5">
        <p
          data-line={line.id}
          className="tfl-dark-line-text text-xl leading-7 font-semibold text-[var(--line-color)]"
        >
          {line.name}
        </p>
        <LineColorBar
          lineId={line.id}
          modeName={line.modeName}
          heightClass="h-1"
        />
      </div>

      <CopyButton
        label={`${line.name} print`}
        value={row.print.value}
        tone="print"
        className="px-2 py-1.5"
      >
        <span className="flex flex-col gap-0.5">
          <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
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

      <div className="flex h-16 w-full overflow-hidden border border-foreground/20 shadow-xs">
        <CopyButton
          label={`${line.name} light ${format}`}
          value={light.value}
          tone="light"
          className="flex flex-1 flex-col items-center justify-between bg-white py-1.5"
        >
          <span className="text-[9px] font-medium tracking-wide text-black/55 uppercase">
            Light
          </span>
          <span aria-hidden className="relative flex h-2.5 w-full items-center">
            <span
              className="block h-0.75 w-full"
              style={{ backgroundColor: light.cssColor }}
            />
            <span
              className="absolute top-1/2 left-1/2 h-2.5 w-0.75 -translate-x-1/2 -translate-y-1/2"
              style={{ backgroundColor: light.cssColor }}
            />
          </span>
          <span className="font-mono text-[8px] leading-tight whitespace-nowrap text-black/80">
            {light.value}
          </span>
        </CopyButton>
        <CopyButton
          label={`${line.name} dark ${format}`}
          value={dark.value}
          tone="dark"
          className="flex flex-1 flex-col items-center justify-between py-1.5"
          style={{ backgroundColor: GO_NIGHT_PAPER }}
        >
          <span className="text-[9px] font-medium tracking-wide text-white/55 uppercase">
            Dark
          </span>
          <span aria-hidden className="relative flex h-2.5 w-full items-center">
            <span
              className="block h-0.75 w-full"
              style={{ backgroundColor: dark.cssColor }}
            />
            <span
              className="absolute top-1/2 left-1/2 h-2.5 w-0.75 -translate-x-1/2 -translate-y-1/2"
              style={{ backgroundColor: dark.cssColor }}
            />
          </span>
          <span className="font-mono text-[8px] leading-tight whitespace-nowrap text-white/90">
            {dark.value}
          </span>
        </CopyButton>
      </div>
    </article>
  )
}

/**
 * Colour gallery: one format select (HEX | OKLCH), grid of tap-to-copy cards.
 * Print (CMYK · Pantone · NCS) is always shown.
 */
export const ColourFormatsGrid = ({
  lines,
  className,
  title,
  titleId,
}: ColourFormatsGridProps) => {
  const [format, setFormat] = useState<ScreenFormat>("hex")

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {title ? (
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>
        ) : (
          <span />
        )}
        <Select
          value={format}
          onValueChange={(value) => {
            if (value === "hex" || value === "oklch") setFormat(value)
          }}
        >
          <SelectTrigger
            id="colour-format-select"
            size="sm"
            aria-label="Screen colour format"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false} align="end">
            <SelectItem value="hex">HEX</SelectItem>
            <SelectItem value="oklch">OKLCH</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {lines.map((line) => (
          <ColourCard key={line.id} line={line} format={format} />
        ))}
      </div>
    </div>
  )
}
