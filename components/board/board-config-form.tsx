"use client"

import Link from "next/link"
import { useId, type ChangeEvent } from "react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RAIL_ARRIVALS_DEFAULT_PAGE_SIZE } from "@/lib/tfl/arrivals-defaults"
import type { RailArrivalsLine } from "@/lib/tfl/arrivals-prepare"
import {
  BOARD_ROWS_MAX,
  BOARD_SETTINGS,
  type BoardSettingId,
} from "@/lib/tfl/board-settings"
import type { BoardConfig } from "@/lib/tfl/board-url-state"
import { cn } from "@/lib/utils"

type RowsMode = "all" | "per-line"

type BoardConfigFormProps = {
  config: BoardConfig
  formSettings: readonly BoardSettingId[]
  /** Offline serving lines for the current stop — drives per-line rows. */
  servingLines?: readonly RailArrivalsLine[]
  onChange: (next: Partial<BoardConfig>) => void
}

const clampRows = (n: number): number =>
  Math.min(Math.max(0, n), BOARD_ROWS_MAX)

const parseRowsInput = (raw: string): number | undefined => {
  const trimmed = raw.trim()
  if (!trimmed) return undefined
  if (!/^\d+$/.test(trimmed)) return undefined
  return clampRows(Number(trimmed))
}

const resolveRowsMode = (
  config: BoardConfig,
  servingLines: readonly RailArrivalsLine[] | undefined,
): RowsMode => {
  if (Array.isArray(config.arrivals.rows)) return "per-line"
  if (config.arrivals.lineOrder?.length && servingLines?.length) {
    return "per-line"
  }
  return "all"
}

/**
 * Build the positional list aligned to `servingLines` / explicit `lineOrder`.
 * Missing slots use the component default so the URL stays a complete zip.
 */
const rowsListForLines = (
  config: BoardConfig,
  lineIds: readonly string[],
): number[] => {
  const rows = config.arrivals.rows
  if (typeof rows === "number") {
    return lineIds.map(() => rows)
  }
  if (Array.isArray(rows)) {
    return lineIds.map((_, index) => {
      const value = rows[index]
      return value === undefined ? RAIL_ARRIVALS_DEFAULT_PAGE_SIZE : value
    })
  }
  return lineIds.map(() => RAIL_ARRIVALS_DEFAULT_PAGE_SIZE)
}

/**
 * Selective Config form — only renders settings allowlisted by the active
 * preset (`form: true` definitions). Display options that are URL-ready but
 * not product-live stay in a disabled "Coming soon" fieldset when listed.
 */
export const BoardConfigForm = ({
  config,
  formSettings,
  servingLines,
  onChange,
}: BoardConfigFormProps) => {
  const rowsModeId = useId()
  const rowsMode = resolveRowsMode(config, servingLines)
  const lineIds = (servingLines ?? []).map((line) => line.lineId)
  const perLineValues = rowsListForLines(config, lineIds)

  const handleStopChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ stop: event.target.value })
  }

  const handleStopNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ stopName: event.target.value })
  }

  const handleRowsModeChange = (mode: RowsMode) => {
    if (mode === "all") {
      const scalar =
        typeof config.arrivals.rows === "number"
          ? config.arrivals.rows
          : Array.isArray(config.arrivals.rows)
            ? (config.arrivals.rows.find(
                (value): value is number => typeof value === "number",
              ) ?? RAIL_ARRIVALS_DEFAULT_PAGE_SIZE)
            : RAIL_ARRIVALS_DEFAULT_PAGE_SIZE
      onChange({
        arrivals: {
          ...config.arrivals,
          rows: scalar,
          lineOrder: undefined,
        },
      })
      return
    }

    if (!servingLines?.length) return

    const list = rowsListForLines(config, lineIds)
    onChange({
      arrivals: {
        ...config.arrivals,
        rows: list,
        lineOrder: lineIds,
      },
    })
  }

  const handleScalarRowsChange = (event: ChangeEvent<HTMLInputElement>) => {
    const parsed = parseRowsInput(event.target.value)
    if (parsed === undefined && event.target.value.trim() !== "") return
    onChange({
      arrivals: {
        ...config.arrivals,
        rows: parsed,
        lineOrder: undefined,
      },
    })
  }

  const handlePerLineRowsChange = (lineIndex: number, raw: string) => {
    if (!servingLines?.length) return
    const parsed = parseRowsInput(raw)
    if (parsed === undefined && raw.trim() !== "") return

    const next = [...rowsListForLines(config, lineIds)]
    next[lineIndex] =
      parsed === undefined ? RAIL_ARRIVALS_DEFAULT_PAGE_SIZE : parsed

    onChange({
      arrivals: {
        ...config.arrivals,
        rows: next,
        lineOrder: lineIds,
      },
    })
  }

  const scalarRowsValue =
    typeof config.arrivals.rows === "number"
      ? config.arrivals.rows
      : RAIL_ARRIVALS_DEFAULT_PAGE_SIZE

  return (
    <form
      className="grid max-w-xl gap-5 p-4"
      onSubmit={(event) => event.preventDefault()}
    >
      {formSettings.includes("stop") ? (
        <div className="space-y-2">
          <Label htmlFor="board-stop">{BOARD_SETTINGS.stop.ui?.label}</Label>
          <Input
            id="board-stop"
            name="stop"
            value={config.stop ?? ""}
            onChange={handleStopChange}
            autoComplete="off"
            spellCheck={false}
            aria-describedby="board-stop-hint"
          />
          <p id="board-stop-hint" className="text-sm text-muted-foreground">
            Station NaPTAN ID. Find it in{" "}
            <Link
              href="/docs/explorer"
              className="text-foreground underline underline-offset-4"
            >
              Explorer
            </Link>
            .
          </p>
        </div>
      ) : null}

      {formSettings.includes("stopName") ? (
        <div className="space-y-2">
          <Label htmlFor="board-stop-name">
            {BOARD_SETTINGS.stopName.ui?.label}
          </Label>
          <Input
            id="board-stop-name"
            name="stopName"
            value={config.stopName ?? ""}
            onChange={handleStopNameChange}
            autoComplete="off"
            aria-describedby="board-stop-name-hint"
          />
          <p
            id="board-stop-name-hint"
            className="text-sm text-muted-foreground"
          >
            Auto-fills from the Stop ID. Edit to show a custom label; clear
            to go back to auto.
          </p>
        </div>
      ) : null}

      {formSettings.includes("arrivalsRows") ? (
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-foreground">
            {BOARD_SETTINGS.arrivalsRows.ui?.label}
          </legend>

          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Rows per bound mode"
          >
            <button
              type="button"
              id={`${rowsModeId}-all`}
              aria-pressed={rowsMode === "all"}
              onClick={() => handleRowsModeChange("all")}
              className={cn(
                "h-8 rounded-lg border px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                rowsMode === "all"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-transparent text-foreground hover:bg-muted"
              )}
            >
              All lines
            </button>
            <button
              type="button"
              id={`${rowsModeId}-per-line`}
              aria-pressed={rowsMode === "per-line"}
              disabled={!servingLines?.length}
              onClick={() => handleRowsModeChange("per-line")}
              className={cn(
                "h-8 rounded-lg border px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                rowsMode === "per-line"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-transparent text-foreground hover:bg-muted",
                !servingLines?.length && "cursor-not-allowed opacity-50"
              )}
            >
              Per line
            </button>
          </div>

          {rowsMode === "all" ? (
            <div className="space-y-2">
              <Label htmlFor="board-rows" className="sr-only">
                Rows for every line
              </Label>
              <Input
                id="board-rows"
                name="a.rows"
                type="number"
                min={0}
                max={BOARD_ROWS_MAX}
                step={1}
                value={scalarRowsValue}
                onChange={handleScalarRowsChange}
                aria-describedby="board-rows-hint"
              />
            </div>
          ) : servingLines?.length ? (
            <div className="grid gap-3" role="group" aria-label="Rows per line">
              {servingLines.map((line, index) => {
                const inputId = `board-rows-${line.lineId}`
                return (
                  <div
                    key={line.lineId}
                    className="grid grid-cols-[minmax(0,1fr)_5.5rem] items-center gap-3"
                  >
                    <Label htmlFor={inputId} className="min-w-0 truncate">
                      {line.lineName}
                    </Label>
                    <Input
                      id={inputId}
                      name={`a.rows.${line.lineId}`}
                      type="number"
                      min={0}
                      max={BOARD_ROWS_MAX}
                      step={1}
                      value={perLineValues[index] ?? RAIL_ARRIVALS_DEFAULT_PAGE_SIZE}
                      onChange={(event) =>
                        handlePerLineRowsChange(index, event.target.value)
                      }
                      aria-label={`${line.lineName} rows per bound`}
                    />
                  </div>
                )
              })}
            </div>
          ) : null}

          <p id="board-rows-hint" className="text-sm text-muted-foreground">
            {servingLines?.length
              ? "All lines uses one value for every bound. Per line maps each number to a serving line in order (and writes line order into the URL)."
              : "Enter a stop with known Tube or rail lines to set rows per line. 0 shows every row (no pager)."}
          </p>
        </fieldset>
      ) : null}

      <fieldset className="space-y-3" disabled>
        <legend className="flex items-center gap-2 text-sm font-medium text-foreground">
          <span>Display options</span>
          <Badge variant="secondary">Coming soon</Badge>
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="board-mode">
              {BOARD_SETTINGS.mode.ui?.label}
            </Label>
            <select
              id="board-mode"
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm opacity-60"
              value={config.mode}
              disabled
              aria-disabled
            >
              {BOARD_SETTINGS.mode.ui?.options?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="board-fit">{BOARD_SETTINGS.fit.ui?.label}</Label>
            <select
              id="board-fit"
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm opacity-60"
              value={config.fit}
              disabled
              aria-disabled
            >
              {BOARD_SETTINGS.fit.ui?.options?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </fieldset>
    </form>
  )
}
