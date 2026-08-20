"use client"

import { useMemo, useState, type ChangeEvent } from "react"
import { BoardPlaceSearch } from "@/components/board/board-place-search"
import { BoardSlotEditor } from "@/components/board/board-slot-editor"
import { BoardStationSearch } from "@/components/board/board-station-search"
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
  parseDockIdList,
  parseRouteIdList,
  serializeDockIdList,
  serializeRouteIdList,
} from "@/lib/tfl/board-panels"
import {
  BOARD_SETTINGS,
  parseArrivalsLines,
  parseArrivalsRows,
  serializeArrivalsLines,
  type BoardSettingId,
} from "@/lib/tfl/board-settings"
import type { BoardStationSearchItem } from "@/lib/tfl/board-station-names"
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
  stations?: readonly BoardStationSearchItem[]
  /** Live URL segments for circled field badges (same list as Launch legend). */
  segments?: readonly BoardHrefSegment[]
  onChange: (next: Partial<BoardConfig>) => void
}

/** Keep digits and commas only — `a.rows` shape. */
const normalizeRowsDraft = (raw: string): string => raw.replace(/[^0-9,]/g, "")

/** Keep line-id characters and commas — `a.lines` shape. */
const normalizeLinesDraft = (raw: string): string =>
  raw.toLowerCase().replace(/[^a-z0-9,-]/g, "")

const rowsDraftFromConfig = (rows: BoardConfig["arrivals"]["rows"]): string => {
  if (rows === undefined) return ""
  if (typeof rows === "number") return String(rows)
  return rows.map((item) => (item === undefined ? "" : String(item))).join(",")
}

const linesDraftFromConfig = (
  lineOrder: BoardConfig["arrivals"]["lineOrder"]
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
  stations = [],
  segments = [],
  onChange,
}: BoardConfigFormProps) => {
  const [draftStop, setDraftStop] = useState(config.stop)
  const [rowsDraft, setRowsDraft] = useState(() =>
    rowsDraftFromConfig(config.arrivals.rows)
  )
  const [linesDraft, setLinesDraft] = useState(() =>
    linesDraftFromConfig(config.arrivals.lineOrder)
  )

  // Stop change clears positional arrivals settings — reset drafts to match.
  if (config.stop !== draftStop) {
    setDraftStop(config.stop)
    setRowsDraft(rowsDraftFromConfig(config.arrivals.rows))
    setLinesDraft(linesDraftFromConfig(config.arrivals.lineOrder))
  }

  const sections = useMemo(
    () => resolveEffectiveSections(config, servingLines, [], lineGroups),
    [config, servingLines, lineGroups]
  )
  const rowsPreview = useMemo(
    () => formatArrivalsRowsPreview(config, servingLines, lineGroups),
    [config, servingLines, lineGroups]
  )
  const rowsPlaceholder = formatArrivalsRowsPlaceholder(sections)
  const linesPlaceholder = sections.length
    ? sections.map((section) => section.lineId).join(",")
    : "central,victoria,bakerloo"

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
          <FieldLabel
            htmlFor="board-station"
            setting="stop"
            segments={segments}
          >
            {BOARD_SETTINGS.stop.ui?.label ?? "Station name or Stop ID"}
          </FieldLabel>
          <BoardStationSearch
            stations={stations}
            stopId={config.stop}
            onStopChange={(stop) => onChange({ stop })}
          />
        </div>
      ) : null}

      {formSettings.includes("stopName") ? (
        <div className="space-y-2">
          <FieldLabel
            htmlFor="board-stop-name"
            setting="stopName"
            segments={segments}
          >
            {BOARD_SETTINGS.stopName.ui?.label ?? "Stop name override"}
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
              "Changes the displayed heading. It does not select the data source."}
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
            {BOARD_SETTINGS.arrivalsLines.ui?.label ?? "Lines (optional)"}
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

      {formSettings.includes("arrivalsPinFirst") ? (
        <div className="space-y-2">
          <FieldLabel
            htmlFor="board-pin-first"
            setting="arrivalsPinFirst"
            segments={segments}
          >
            {BOARD_SETTINGS.arrivalsPinFirst.ui?.label ?? "Pin first arrival"}
          </FieldLabel>
          <select
            id="board-pin-first"
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
            value={String(config.arrivals.pinFirst ?? true)}
            onChange={(event) =>
              onChange({
                arrivals: {
                  ...config.arrivals,
                  pinFirst: event.target.value === "true",
                },
              })
            }
          >
            {BOARD_SETTINGS.arrivalsPinFirst.ui?.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="text-sm text-muted-foreground">
            {BOARD_SETTINGS.arrivalsPinFirst.ui?.help}
          </p>
        </div>
      ) : null}

      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Slots</p>
        <BoardSlotEditor
          slots={config.slots}
          onChange={(slots) => onChange({ slots })}
        />
      </div>

      {formSettings.includes("busStop") ? (
        <div className="space-y-2">
          <FieldLabel
            htmlFor="board-bus-search"
            setting="busStop"
            segments={segments}
          >
            {BOARD_SETTINGS.busStop.ui?.label ?? "Bus stop"}
          </FieldLabel>
          <BoardPlaceSearch
            kind="bus"
            selectedId={config.bus.stop}
            onSelect={(place) =>
              onChange({ bus: { ...config.bus, stop: place.id } })
            }
            inputId="board-bus-search"
            placeholder="Search for a bus stop"
            emptyMessage="No bus stops match that search."
          />
          <details className="text-sm">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              Stop ID
            </summary>
            <Input
              id="board-bus-stop"
              className="mt-2"
              value={config.bus.stop ?? ""}
              onChange={(event) =>
                onChange({ bus: { ...config.bus, stop: event.target.value } })
              }
              autoComplete="off"
              spellCheck={false}
            />
          </details>
          <p className="text-sm text-muted-foreground">
            {BOARD_SETTINGS.busStop.ui?.help}
          </p>
        </div>
      ) : null}

      {formSettings.includes("busRoutes") ? (
        <div className="space-y-2">
          <FieldLabel
            htmlFor="board-bus-routes"
            setting="busRoutes"
            segments={segments}
          >
            {BOARD_SETTINGS.busRoutes.ui?.label ?? "Bus routes"}
          </FieldLabel>
          <Input
            id="board-bus-routes"
            value={serializeRouteIdList(config.bus.routes) ?? ""}
            onChange={(event) =>
              onChange({
                bus: {
                  ...config.bus,
                  routes: parseRouteIdList(event.target.value || null),
                },
              })
            }
            autoComplete="off"
            spellCheck={false}
            placeholder="73,n8"
          />
        </div>
      ) : null}

      {formSettings.includes("busRows") ? (
        <div className="space-y-2">
          <FieldLabel
            htmlFor="board-bus-rows"
            setting="busRows"
            segments={segments}
          >
            {BOARD_SETTINGS.busRows.ui?.label ?? "Bus rows"}
          </FieldLabel>
          <Input
            id="board-bus-rows"
            type="number"
            min={0}
            max={16}
            value={config.bus.rows ?? ""}
            onChange={(event) => {
              const raw = event.target.value
              onChange({
                bus: {
                  ...config.bus,
                  rows: raw === "" ? undefined : Number(raw),
                },
              })
            }}
          />
        </div>
      ) : null}

      {formSettings.includes("riverStop") ? (
        <div className="space-y-2">
          <FieldLabel
            htmlFor="board-river-search"
            setting="riverStop"
            segments={segments}
          >
            {BOARD_SETTINGS.riverStop.ui?.label ?? "Pier"}
          </FieldLabel>
          <BoardPlaceSearch
            kind="river"
            selectedId={config.river.stop}
            onSelect={(place) =>
              onChange({ river: { ...config.river, stop: place.id } })
            }
            inputId="board-river-search"
            placeholder="Search for a river pier"
            emptyMessage="No piers match that search."
          />
          <details className="text-sm">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              Pier ID
            </summary>
            <Input
              id="board-river-stop"
              className="mt-2"
              value={config.river.stop ?? ""}
              onChange={(event) =>
                onChange({
                  river: { ...config.river, stop: event.target.value },
                })
              }
              autoComplete="off"
              spellCheck={false}
              placeholder="930GCAW"
            />
          </details>
        </div>
      ) : null}

      {formSettings.includes("riverRows") ? (
        <div className="space-y-2">
          <FieldLabel
            htmlFor="board-river-rows"
            setting="riverRows"
            segments={segments}
          >
            {BOARD_SETTINGS.riverRows.ui?.label ?? "River rows"}
          </FieldLabel>
          <Input
            id="board-river-rows"
            type="number"
            min={0}
            max={16}
            value={config.river.rows ?? ""}
            onChange={(event) => {
              const raw = event.target.value
              onChange({
                river: {
                  ...config.river,
                  rows: raw === "" ? undefined : Number(raw),
                },
              })
            }}
          />
        </div>
      ) : null}

      {formSettings.includes("cycleDocks") ? (
        <div className="space-y-2">
          <FieldLabel
            htmlFor="board-cycle-search"
            setting="cycleDocks"
            segments={segments}
          >
            {BOARD_SETTINGS.cycleDocks.ui?.label ?? "Cycle docks"}
          </FieldLabel>
          <BoardPlaceSearch
            kind="cycle"
            onSelect={(place) => {
              const current = config.cycle.docks ?? []
              if (current.includes(place.id)) return
              onChange({
                cycle: {
                  ...config.cycle,
                  docks: [...current, place.id],
                },
              })
            }}
            inputId="board-cycle-search"
            placeholder="Search for a cycle dock"
            emptyMessage="No docks match that search."
          />
          <Input
            id="board-cycle-docks"
            value={serializeDockIdList(config.cycle.docks) ?? ""}
            onChange={(event) =>
              onChange({
                cycle: {
                  ...config.cycle,
                  docks: parseDockIdList(event.target.value || null),
                },
              })
            }
            autoComplete="off"
            spellCheck={false}
            placeholder="BikePoints_237,BikePoints_46"
            aria-label="Cycle dock ids"
          />
        </div>
      ) : null}

      {formSettings.includes("cycleTiles") ? (
        <div className="space-y-2">
          <FieldLabel
            htmlFor="board-cycle-tiles"
            setting="cycleTiles"
            segments={segments}
          >
            {BOARD_SETTINGS.cycleTiles.ui?.label ?? "Cycle tiles"}
          </FieldLabel>
          <Input
            id="board-cycle-tiles"
            type="number"
            min={1}
            max={16}
            value={config.cycle.tiles ?? ""}
            onChange={(event) => {
              const raw = event.target.value
              onChange({
                cycle: {
                  ...config.cycle,
                  tiles: raw === "" ? undefined : Number(raw),
                },
              })
            }}
          />
        </div>
      ) : null}

      {formSettings.includes("statusSurface") ? (
        <div className="space-y-2">
          <FieldLabel
            htmlFor="board-status-surface"
            setting="statusSurface"
            segments={segments}
          >
            {BOARD_SETTINGS.statusSurface.ui?.label ?? "Status surface"}
          </FieldLabel>
          <select
            id="board-status-surface"
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
            value={config.status.surface ?? "display"}
            onChange={(event) =>
              onChange({
                status: {
                  ...config.status,
                  surface: event.target.value as NonNullable<
                    BoardConfig["status"]["surface"]
                  >,
                },
              })
            }
          >
            {BOARD_SETTINGS.statusSurface.ui?.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {formSettings.includes("statusTiles") ? (
        <div className="space-y-2">
          <FieldLabel
            htmlFor="board-status-tiles"
            setting="statusTiles"
            segments={segments}
          >
            {BOARD_SETTINGS.statusTiles.ui?.label ?? "Status tiles"}
          </FieldLabel>
          <Input
            id="board-status-tiles"
            type="number"
            min={1}
            max={16}
            value={config.status.tiles ?? ""}
            onChange={(event) => {
              const raw = event.target.value
              onChange({
                status: {
                  ...config.status,
                  tiles: raw === "" ? undefined : Number(raw),
                },
              })
            }}
          />
          <p className="text-sm text-muted-foreground">
            {BOARD_SETTINGS.statusTiles.ui?.help}
          </p>
        </div>
      ) : null}

      {formSettings.includes("statusLines") ? (
        <div className="space-y-2">
          <FieldLabel
            htmlFor="board-status-lines"
            setting="statusLines"
            segments={segments}
          >
            {BOARD_SETTINGS.statusLines.ui?.label ?? "Status lines"}
          </FieldLabel>
          <Input
            id="board-status-lines"
            value={serializeArrivalsLines(config.status.lines) ?? ""}
            onChange={(event) =>
              onChange({
                status: {
                  ...config.status,
                  lines: parseArrivalsLines(event.target.value || null),
                },
              })
            }
            autoComplete="off"
            spellCheck={false}
            placeholder="elizabeth,central"
          />
          <p className="text-sm text-muted-foreground">
            {BOARD_SETTINGS.statusLines.ui?.help}
          </p>
        </div>
      ) : null}

      {formSettings.includes("statusOverview") ? (
        <div className="space-y-2">
          <FieldLabel
            htmlFor="board-status-overview"
            setting="statusOverview"
            segments={segments}
          >
            {BOARD_SETTINGS.statusOverview.ui?.label ?? "Status overview"}
          </FieldLabel>
          <select
            id="board-status-overview"
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
            value={config.status.overview ?? "network"}
            onChange={(event) =>
              onChange({
                status: {
                  ...config.status,
                  overview: event.target.value as NonNullable<
                    BoardConfig["status"]["overview"]
                  >,
                },
              })
            }
          >
            {BOARD_SETTINGS.statusOverview.ui?.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
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
