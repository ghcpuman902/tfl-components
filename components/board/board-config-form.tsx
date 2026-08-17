"use client"

import Link from "next/link"
import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from "react"
import {
  BoardSegmentBadge,
  boardSegmentIndex,
} from "@/components/board/board-url-legend"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { RailArrivalsLine } from "@/lib/tfl/arrivals-prepare"
import {
  formatArrivalsRowsPlaceholder,
  formatArrivalsRowsPreview,
  resolveEffectiveSections,
} from "@/lib/tfl/board-config-resolve"
import type { BoardStationLineGroup } from "@/lib/tfl/board-station-lines"
import {
  BOARD_SETTINGS,
  parseArrivalsLines,
  parseArrivalsRows,
  serializeArrivalsLines,
  type BoardSettingId,
} from "@/lib/tfl/board-settings"
import {
  type BoardConfig,
  type BoardHrefSegment,
} from "@/lib/tfl/board-url-state"

type BoardConfigFormProps = {
  config: BoardConfig
  formSettings: readonly BoardSettingId[]
  /** Offline serving lines for the current stop — drives rows preview. */
  servingLines?: readonly RailArrivalsLine[]
  /** Shared-platform merges for the current stop — same table as the board. */
  lineGroups?: readonly BoardStationLineGroup[]
  /** Catalog name for the current Stop ID — placeholder, not a URL value. */
  autoStopName?: string
  /** Live URL segments for circled field badges (same list as Launch legend). */
  segments?: readonly BoardHrefSegment[]
  onChange: (next: Partial<BoardConfig>) => void
}

/** Keep digits and commas only — `a.rows` shape. */
const normalizeRowsDraft = (raw: string): string =>
  raw.replace(/[^0-9,]/g, "")

/** Keep line-id characters and commas — `a.lines` shape. */
const normalizeLinesDraft = (raw: string): string =>
  raw.toLowerCase().replace(/[^a-z0-9,-]/g, "")

const rowsDraftFromConfig = (
  rows: BoardConfig["arrivals"]["rows"],
): string => {
  if (rows === undefined) return ""
  if (typeof rows === "number") return String(rows)
  return rows
    .map((item) => (item === undefined ? "" : String(item)))
    .join(",")
}

const linesDraftFromConfig = (
  lineOrder: BoardConfig["arrivals"]["lineOrder"],
): string => serializeArrivalsLines(lineOrder) ?? ""

const FieldLabel = ({
  htmlFor,
  setting,
  segments,
  children,
}: {
  htmlFor: string
  setting: BoardSettingId
  segments: readonly BoardHrefSegment[]
  children: string
}) => (
  <Label htmlFor={htmlFor} className="flex items-center gap-1.5">
    <BoardSegmentBadge index={boardSegmentIndex(segments, setting)} />
    <span>{children}</span>
  </Label>
)

/**
 * Selective Config form — only renders settings allowlisted by the active
 * preset (`form: true` definitions). Display options that are URL-ready but
 * not product-live stay in a disabled "Coming soon" fieldset when listed.
 */
export const BoardConfigForm = ({
  config,
  formSettings,
  servingLines,
  lineGroups,
  autoStopName,
  segments = [],
  onChange,
}: BoardConfigFormProps) => {
  const [rowsDraft, setRowsDraft] = useState(() =>
    rowsDraftFromConfig(config.arrivals.rows),
  )
  const [linesDraft, setLinesDraft] = useState(() =>
    linesDraftFromConfig(config.arrivals.lineOrder),
  )

  // Stop change clears positional arrivals settings — reset drafts to match.
  useEffect(() => {
    setRowsDraft(rowsDraftFromConfig(config.arrivals.rows))
    setLinesDraft(linesDraftFromConfig(config.arrivals.lineOrder))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only reset on stop change
  }, [config.stop])

  const sections = useMemo(
    () => resolveEffectiveSections(config, servingLines, [], lineGroups),
    [config, servingLines, lineGroups],
  )
  const rowsPreview = useMemo(
    () => formatArrivalsRowsPreview(config, servingLines, lineGroups),
    [config, servingLines, lineGroups],
  )
  const rowsPlaceholder = formatArrivalsRowsPlaceholder(sections)
  const linesPlaceholder = sections.length
    ? sections.map((section) => section.lineId).join(",")
    : "central,victoria,bakerloo"

  const handleStopChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ stop: event.target.value })
  }

  const handleStopNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ stopName: event.target.value })
  }

  const handleLinesChange = (event: ChangeEvent<HTMLInputElement>) => {
    const draft = normalizeLinesDraft(event.target.value)
    setLinesDraft(draft)
    onChange({
      arrivals: {
        ...config.arrivals,
        lineOrder: parseArrivalsLines(draft || null),
      },
    })
  }

  const handleRowsChange = (event: ChangeEvent<HTMLInputElement>) => {
    const draft = normalizeRowsDraft(event.target.value)
    setRowsDraft(draft)
    if (!draft) {
      onChange({
        arrivals: {
          ...config.arrivals,
          rows: undefined,
        },
      })
      return
    }
    onChange({
      arrivals: {
        ...config.arrivals,
        rows: parseArrivalsRows(draft),
      },
    })
  }

  return (
    <form
      className="grid max-w-xl gap-5 p-4"
      onSubmit={(event) => event.preventDefault()}
    >
      {formSettings.includes("stop") ? (
        <div className="space-y-2">
          <FieldLabel htmlFor="board-stop" setting="stop" segments={segments}>
            {BOARD_SETTINGS.stop.ui?.label ?? "Stop ID"}
          </FieldLabel>
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
          <FieldLabel
            htmlFor="board-stop-name"
            setting="stopName"
            segments={segments}
          >
            {BOARD_SETTINGS.stopName.ui?.label ?? "Stop name (optional)"}
          </FieldLabel>
          <Input
            id="board-stop-name"
            name="stopName"
            value={config.stopName ?? ""}
            onChange={handleStopNameChange}
            autoComplete="off"
            placeholder={autoStopName}
            aria-describedby="board-stop-name-hint"
          />
          <p
            id="board-stop-name-hint"
            className="text-sm text-muted-foreground"
          >
            {BOARD_SETTINGS.stopName.ui?.help ??
              "Override the heading. Leave blank to use the station name from the Stop ID."}
          </p>
        </div>
      ) : null}

      {formSettings.includes("arrivalsLines") ? (
        <div className="space-y-2">
          <FieldLabel
            htmlFor="board-lines"
            setting="arrivalsLines"
            segments={segments}
          >
            {BOARD_SETTINGS.arrivalsLines.ui?.label ?? "Line order (optional)"}
          </FieldLabel>
          <Input
            id="board-lines"
            name="a.lines"
            value={linesDraft}
            onChange={handleLinesChange}
            autoComplete="off"
            spellCheck={false}
            placeholder={linesPlaceholder}
            aria-describedby="board-lines-hint"
          />
          <p id="board-lines-hint" className="text-sm text-muted-foreground">
            {BOARD_SETTINGS.arrivalsLines.ui?.help}
          </p>
        </div>
      ) : null}

      {formSettings.includes("arrivalsRows") ? (
        <div className="space-y-2">
          <FieldLabel
            htmlFor="board-rows"
            setting="arrivalsRows"
            segments={segments}
          >
            {BOARD_SETTINGS.arrivalsRows.ui?.label ?? "Rows per line"}
          </FieldLabel>
          <Input
            id="board-rows"
            name="a.rows"
            value={rowsDraft}
            onChange={handleRowsChange}
            autoComplete="off"
            spellCheck={false}
            inputMode="numeric"
            placeholder={rowsPlaceholder}
            aria-describedby={
              rowsPreview
                ? "board-rows-preview board-rows-hint"
                : "board-rows-hint"
            }
          />
          {rowsPreview ? (
            <p id="board-rows-preview" className="text-sm text-foreground">
              {rowsPreview}
            </p>
          ) : null}
          <p id="board-rows-hint" className="text-sm text-muted-foreground">
            {BOARD_SETTINGS.arrivalsRows.ui?.help}
          </p>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="board-behaviour">
          {BOARD_SETTINGS.behaviour.ui?.label}
        </Label>
        <select
          id="board-behaviour"
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
          value={config.behaviour}
          onChange={(event) =>
            onChange({
              behaviour: event.target.value as BoardConfig["behaviour"],
            })
          }
        >
          {BOARD_SETTINGS.behaviour.ui?.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="text-sm text-muted-foreground">
          {BOARD_SETTINGS.behaviour.ui?.help}
        </p>
      </div>
    </form>
  )
}
