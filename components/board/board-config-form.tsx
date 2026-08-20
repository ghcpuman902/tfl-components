"use client"

import { useMemo, useState, type ChangeEvent, type ReactNode } from "react"
import { ChevronDownIcon } from "lucide-react"
import { LINE_ORDER } from "tfl-ts"
import { BoardLineChipPicker } from "@/components/board/board-line-chip-picker"
import { BoardPlaceSearch } from "@/components/board/board-place-search"
import { BoardSlotEditor } from "@/components/board/board-slot-editor"
import { BoardStationSearch } from "@/components/board/board-station-search"
import {
  BoardSegmentBadge,
  BoardUrlLegend,
  boardSegmentIndex,
} from "@/components/board/board-url-legend"
import { BusNumberChip } from "@/components/tfl/arrivals/bus-number-chip"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
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
  parseArrivalsRows,
  type BoardSettingId,
} from "@/lib/tfl/board-settings"
import type { BoardStationSearchItem } from "@/lib/tfl/board-station-names"
import {
  type BoardConfig,
  type BoardHrefSegment,
} from "@/lib/tfl/board-url-state"
import { getLineNameTiers } from "@/lib/tfl/line-names"
import { cn } from "@/lib/utils"

type BoardConfigFieldsProps = {
  config: BoardConfig
  formSettings: readonly BoardSettingId[]
  servingLines?: readonly RailArrivalsLine[]
  lineGroups?: readonly BoardStationLineGroup[]
  autoStopName?: string
  stations?: readonly BoardStationSearchItem[]
  segments?: readonly BoardHrefSegment[]
  onChange: (next: Partial<BoardConfig>) => void
}

const STATUS_LINE_CANDIDATES = LINE_ORDER.map((lineId) => ({
  lineId,
  lineName: getLineNameTiers(lineId).full,
}))

const normalizeRowsDraft = (raw: string): string => raw.replace(/[^0-9,]/g, "")

const rowsDraftFromConfig = (rows: BoardConfig["arrivals"]["rows"]): string => {
  if (rows === undefined) return ""
  if (typeof rows === "number") return String(rows)
  return rows.map((item) => (item === undefined ? "" : String(item))).join(",")
}

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

const Field = ({
  children,
}: {
  children: ReactNode
}) => <div className="space-y-2">{children}</div>

const Help = ({ children }: { children: ReactNode }) =>
  children ? (
    <p className="text-sm text-muted-foreground">{children}</p>
  ) : null

const NativeSelect = ({
  id,
  value,
  onChange,
  options,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  options: readonly { value: string; label: string }[]
}) => (
  <select
    id={id}
    className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
    value={value}
    onChange={(event) => onChange(event.target.value)}
  >
    {options.map((option) => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </select>
)

const NumberField = ({
  id,
  value,
  min,
  max,
  onChange,
}: {
  id: string
  value: number | undefined
  min: number
  max: number
  onChange: (value: number | undefined) => void
}) => (
  <Input
    id={id}
    type="number"
    min={min}
    max={max}
    value={value ?? ""}
    onChange={(event) => {
      const raw = event.target.value
      onChange(raw === "" ? undefined : Number(raw))
    }}
  />
)

const show = (
  formSettings: readonly BoardSettingId[],
  id: BoardSettingId
): boolean => formSettings.includes(id)

export const BoardQuickConfig = ({
  config,
  formSettings,
  servingLines,
  stations = [],
  segments = [],
  onChange,
  parts = "all",
}: BoardConfigFieldsProps & {
  parts?: "places" | "filters" | "all"
}) => {
  const servingCandidates = servingLines ?? []
  const showPlaces = parts === "places" || parts === "all"
  const showFilters = parts === "filters" || parts === "all"
  const hasLinePicker =
    show(formSettings, "arrivalsLines") && servingCandidates.length > 1

  if (parts === "filters" && !hasLinePicker) return null

  return (
    <div className="grid gap-5">
      {showPlaces && show(formSettings, "stop") ? (
        <Field>
          <FieldLabel htmlFor="board-station" setting="stop" segments={segments}>
            {BOARD_SETTINGS.stop.ui?.label ?? "Station"}
          </FieldLabel>
          <BoardStationSearch
            stations={stations}
            stopId={config.stop}
            onStopChange={(stop) => onChange({ stop })}
          />
        </Field>
      ) : null}

      {showFilters && hasLinePicker ? (
        <Field>
          <FieldLabel
            htmlFor="board-lines"
            setting="arrivalsLines"
            segments={segments}
          >
            Lines
          </FieldLabel>
          <BoardLineChipPicker
            id="board-lines"
            lines={servingCandidates}
            selected={config.arrivals.lineOrder}
            onChange={(lineOrder) =>
              onChange({
                arrivals: { ...config.arrivals, lineOrder },
              })
            }
          />
        </Field>
      ) : null}

      {showPlaces && show(formSettings, "busStop") ? (
        <Field>
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
        </Field>
      ) : null}

      {showPlaces && show(formSettings, "riverStop") ? (
        <Field>
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
        </Field>
      ) : null}

      {showPlaces && show(formSettings, "cycleDocks") ? (
        <Field>
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
        </Field>
      ) : null}
    </div>
  )
}

export const BoardAdvancedConfig = ({
  config,
  formSettings,
  servingLines,
  lineGroups,
  autoStopName,
  segments = [],
  legendPath,
  onChange,
  open,
  onOpenChange,
}: BoardConfigFieldsProps & {
  legendPath: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) => {
  const [draftStop, setDraftStop] = useState(config.stop)
  const [rowsDraft, setRowsDraft] = useState(() =>
    rowsDraftFromConfig(config.arrivals.rows)
  )

  if (config.stop !== draftStop) {
    setDraftStop(config.stop)
    setRowsDraft(rowsDraftFromConfig(config.arrivals.rows))
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
  const busRoutes = config.bus.routes ?? []

  const handleStopNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ stopName: event.target.value })
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

  const handleRemoveBusRoute = (routeId: string) => {
    const next = busRoutes.filter((id) => id !== routeId)
    onChange({
      bus: {
        ...config.bus,
        routes: next.length > 0 ? next : undefined,
      },
    })
  }

  return (
    <Collapsible
      open={open}
      onOpenChange={onOpenChange}
      className="rounded-xl border border-border"
    >
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-4 rounded-xl px-4 py-3 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        <span className="block text-lg font-semibold text-foreground">
          Advanced
        </span>
        <ChevronDownIcon
          className={cn(
            "size-4 shrink-0 transition-transform duration-150 ease-[ease]",
            open && "rotate-180"
          )}
          aria-hidden
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t border-border">
        <div className="grid max-w-3xl gap-5 p-4">
          <BoardUrlLegend path={legendPath} segments={segments} />
          {show(formSettings, "stopName") ? (
            <Field>
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
              <Help>
                <span id="board-stop-name-hint">
                  {BOARD_SETTINGS.stopName.ui?.help}
                </span>
              </Help>
            </Field>
          ) : null}

          {show(formSettings, "arrivalsRows") ? (
            <Field>
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
              <Help>
                <span id="board-rows-hint">
                  {BOARD_SETTINGS.arrivalsRows.ui?.help}
                </span>
              </Help>
            </Field>
          ) : null}

          {show(formSettings, "arrivalsPinFirst") ? (
            <Field>
              <FieldLabel
                htmlFor="board-pin-first"
                setting="arrivalsPinFirst"
                segments={segments}
              >
                {BOARD_SETTINGS.arrivalsPinFirst.ui?.label ?? "Pin first arrival"}
              </FieldLabel>
              <NativeSelect
                id="board-pin-first"
                value={String(config.arrivals.pinFirst ?? true)}
                onChange={(value) =>
                  onChange({
                    arrivals: {
                      ...config.arrivals,
                      pinFirst: value === "true",
                    },
                  })
                }
                options={BOARD_SETTINGS.arrivalsPinFirst.ui?.options ?? []}
              />
              <Help>{BOARD_SETTINGS.arrivalsPinFirst.ui?.help}</Help>
            </Field>
          ) : null}

          {show(formSettings, "busRoutes") ? (
            <Field>
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
              {busRoutes.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {busRoutes.map((routeId) => (
                    <button
                      key={routeId}
                      type="button"
                      className="inline-flex items-center gap-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                      aria-label={`Remove route ${routeId}`}
                      onClick={() => handleRemoveBusRoute(routeId)}
                    >
                      <BusNumberChip label={routeId} />
                      <span aria-hidden className="text-sm text-muted-foreground">
                        ×
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
              <Help>{BOARD_SETTINGS.busRoutes.ui?.help}</Help>
            </Field>
          ) : null}

          {show(formSettings, "busRows") ? (
            <Field>
              <FieldLabel
                htmlFor="board-bus-rows"
                setting="busRows"
                segments={segments}
              >
                {BOARD_SETTINGS.busRows.ui?.label ?? "Bus rows"}
              </FieldLabel>
              <NumberField
                id="board-bus-rows"
                min={0}
                max={16}
                value={config.bus.rows}
                onChange={(rows) =>
                  onChange({ bus: { ...config.bus, rows } })
                }
              />
            </Field>
          ) : null}

          {show(formSettings, "riverRows") ? (
            <Field>
              <FieldLabel
                htmlFor="board-river-rows"
                setting="riverRows"
                segments={segments}
              >
                {BOARD_SETTINGS.riverRows.ui?.label ?? "River rows"}
              </FieldLabel>
              <NumberField
                id="board-river-rows"
                min={0}
                max={16}
                value={config.river.rows}
                onChange={(rows) =>
                  onChange({ river: { ...config.river, rows } })
                }
              />
            </Field>
          ) : null}

          {show(formSettings, "cycleTiles") ? (
            <Field>
              <FieldLabel
                htmlFor="board-cycle-tiles"
                setting="cycleTiles"
                segments={segments}
              >
                {BOARD_SETTINGS.cycleTiles.ui?.label ?? "Cycle tiles"}
              </FieldLabel>
              <NumberField
                id="board-cycle-tiles"
                min={1}
                max={16}
                value={config.cycle.tiles}
                onChange={(tiles) =>
                  onChange({ cycle: { ...config.cycle, tiles } })
                }
              />
            </Field>
          ) : null}

          {show(formSettings, "statusSurface") ? (
            <Field>
              <FieldLabel
                htmlFor="board-status-surface"
                setting="statusSurface"
                segments={segments}
              >
                {BOARD_SETTINGS.statusSurface.ui?.label ?? "Status surface"}
              </FieldLabel>
              <NativeSelect
                id="board-status-surface"
                value={config.status.surface ?? "display"}
                onChange={(value) =>
                  onChange({
                    status: {
                      ...config.status,
                      surface: value as NonNullable<
                        BoardConfig["status"]["surface"]
                      >,
                    },
                  })
                }
                options={BOARD_SETTINGS.statusSurface.ui?.options ?? []}
              />
            </Field>
          ) : null}

          {show(formSettings, "statusTiles") ? (
            <Field>
              <FieldLabel
                htmlFor="board-status-tiles"
                setting="statusTiles"
                segments={segments}
              >
                {BOARD_SETTINGS.statusTiles.ui?.label ?? "Status tiles"}
              </FieldLabel>
              <NumberField
                id="board-status-tiles"
                min={1}
                max={16}
                value={config.status.tiles}
                onChange={(tiles) =>
                  onChange({ status: { ...config.status, tiles } })
                }
              />
              <Help>{BOARD_SETTINGS.statusTiles.ui?.help}</Help>
            </Field>
          ) : null}

          {show(formSettings, "statusLines") ? (
            <Field>
              <FieldLabel
                htmlFor="board-status-lines"
                setting="statusLines"
                segments={segments}
              >
                Status lines
              </FieldLabel>
              <BoardLineChipPicker
                id="board-status-lines"
                lines={STATUS_LINE_CANDIDATES}
                selected={config.status.lines}
                onChange={(lines) =>
                  onChange({
                    status: { ...config.status, lines },
                  })
                }
              />
            </Field>
          ) : null}

          {show(formSettings, "statusOverview") ? (
            <Field>
              <FieldLabel
                htmlFor="board-status-overview"
                setting="statusOverview"
                segments={segments}
              >
                {BOARD_SETTINGS.statusOverview.ui?.label ?? "Status overview"}
              </FieldLabel>
              <NativeSelect
                id="board-status-overview"
                value={config.status.overview ?? "network"}
                onChange={(value) =>
                  onChange({
                    status: {
                      ...config.status,
                      overview: value as NonNullable<
                        BoardConfig["status"]["overview"]
                      >,
                    },
                  })
                }
                options={BOARD_SETTINGS.statusOverview.ui?.options ?? []}
              />
            </Field>
          ) : null}

          {show(formSettings, "statusDwell") ? (
            <Field>
              <FieldLabel
                htmlFor="board-status-dwell"
                setting="statusDwell"
                segments={segments}
              >
                {BOARD_SETTINGS.statusDwell.ui?.label ?? "Status dwell"}
              </FieldLabel>
              <NumberField
                id="board-status-dwell"
                min={1}
                max={120}
                value={config.status.dwell}
                onChange={(dwell) =>
                  onChange({ status: { ...config.status, dwell } })
                }
              />
              <Help>{BOARD_SETTINGS.statusDwell.ui?.help}</Help>
            </Field>
          ) : null}

          <Field>
            <p className="text-sm font-medium text-foreground">Slots</p>
            <BoardSlotEditor
              slots={config.slots}
              onChange={(slots) => onChange({ slots })}
            />
          </Field>

          {show(formSettings, "behaviour") ? (
            <Field>
              <Label htmlFor="board-behaviour">
                {BOARD_SETTINGS.behaviour.ui?.label}
              </Label>
              <NativeSelect
                id="board-behaviour"
                value={config.behaviour}
                onChange={(value) =>
                  onChange({
                    behaviour: value as BoardConfig["behaviour"],
                  })
                }
                options={BOARD_SETTINGS.behaviour.ui?.options ?? []}
              />
              <Help>{BOARD_SETTINGS.behaviour.ui?.help}</Help>
            </Field>
          ) : null}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
