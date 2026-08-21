"use client"

import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react"
import { ChevronDownIcon } from "lucide-react"
import { LINE_ORDER } from "tfl-ts"
import { BoardChipListEditor } from "@/components/board/board-chip-list-editor"
import { BoardCycleDockPicker } from "@/components/board/board-cycle-dock-picker"
import {
  BoardModeRoundel,
  roundelForSetting,
} from "@/components/board/board-mode-roundel"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
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
import { sameChipOrder } from "@/lib/tfl/board-chip-list"
import { getBoardBusStopRoutes } from "@/lib/tfl/board-place-search-action"
import {
  BOARD_SETTINGS,
  parseArrivalsRows,
  type BoardSettingId,
  type BoardSettingOption,
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
  hideRoundel = false,
}: {
  htmlFor: string
  setting: BoardSettingId
  segments: readonly BoardHrefSegment[]
  children: string
  hideRoundel?: boolean
}) => {
  const roundel = hideRoundel ? null : roundelForSetting(setting)
  return (
    <Label htmlFor={htmlFor} className="flex items-center gap-1.5">
      {roundel ? <BoardModeRoundel variant={roundel} /> : null}
      <BoardSegmentBadge index={boardSegmentIndex(segments, setting)} />
      <span>{children}</span>
    </Label>
  )
}

const Field = ({
  children,
}: {
  children: ReactNode
}) => <div className="space-y-2">{children}</div>

const FormGroup = ({
  title,
  roundel,
  children,
}: {
  title: string
  roundel: "underground" | "buses" | "river" | "cycles"
  children: ReactNode
}) => (
  <section className="space-y-4" aria-label={title}>
    <h3 className="flex items-center gap-1.5 text-sm font-medium">
      <BoardModeRoundel variant={roundel} />
      {title}
    </h3>
    <div className="space-y-4">{children}</div>
  </section>
)

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
  options: readonly BoardSettingOption[]
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

const DescribedSelect = ({
  id,
  value,
  ariaLabel,
  onChange,
  options,
}: {
  id: string
  value: string
  ariaLabel: string
  onChange: (value: string) => void
  options: readonly BoardSettingOption[]
}) => {
  const selected =
    options.find((option) => option.value === value) ?? options[0]

  return (
    <Select
      value={value}
      onValueChange={(next) => {
        if (next) onChange(next)
      }}
    >
      <SelectTrigger
        id={id}
        aria-label={ariaLabel}
        className="h-auto w-full min-h-8 whitespace-normal py-1.5 data-[size=default]:h-auto"
      >
        {selected ? (
          <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left">
            <span>{selected.label}</span>
            {selected.description ? (
              <span className="text-xs font-normal text-muted-foreground">
                {selected.description}
              </span>
            ) : null}
          </span>
        ) : null}
      </SelectTrigger>
      <SelectContent align="start" alignItemWithTrigger={false}>
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            className="items-start py-1.5"
          >
            <span className="flex flex-col items-start gap-0.5 whitespace-normal">
              <span>{option.label}</span>
              {option.description ? (
                <span className="text-xs font-normal text-muted-foreground">
                  {option.description}
                </span>
              ) : null}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

const NumberField = ({
  id,
  value,
  fallback,
  min,
  max,
  onChange,
}: {
  id: string
  value: number | undefined
  fallback?: number
  min: number
  max: number
  onChange: (value: number | undefined) => void
}) => (
  <Input
    id={id}
    type="number"
    min={min}
    max={max}
    value={value ?? fallback ?? ""}
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
  parts?: "places" | "filters" | "nearby" | "all"
}) => {
  const servingCandidates = servingLines ?? []
  const showPlaces = parts === "places" || parts === "all"
  const showNearby = parts === "nearby" || showPlaces
  const showFilters = parts === "filters" || parts === "all"
  const hasLinePicker =
    show(formSettings, "arrivalsLines") && servingCandidates.length > 1

  if (parts === "filters" && !hasLinePicker) return null
  if (
    parts === "nearby" &&
    !show(formSettings, "busStop") &&
    !show(formSettings, "riverStop") &&
    !show(formSettings, "cycleDocks")
  ) {
    return null
  }

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

      {showNearby && show(formSettings, "busStop") ? (
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
        </Field>
      ) : null}

      {showNearby && show(formSettings, "riverStop") ? (
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
        </Field>
      ) : null}

      {showNearby && show(formSettings, "cycleDocks") ? (
        <Field>
          <FieldLabel
            htmlFor="board-cycle-docks"
            setting="cycleDocks"
            segments={segments}
          >
            {BOARD_SETTINGS.cycleDocks.ui?.label ?? "Cycle docks"}
          </FieldLabel>
          <BoardCycleDockPicker
            key={config.stop ?? "cycle-docks"}
            id="board-cycle-docks"
            stopId={config.stop}
            docks={config.cycle.docks}
            onChange={(docks) =>
              onChange({
                cycle: {
                  ...config.cycle,
                  docks: docks.length > 0 ? [...docks] : undefined,
                },
              })
            }
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
  segments: segmentsProp = [],
  legendPath,
  onChange,
  open,
  onOpenChange,
  hideTrigger = false,
}: BoardConfigFieldsProps & {
  legendPath: string
  open: boolean
  onOpenChange: (open: boolean) => void
  hideTrigger?: boolean
}) => {
  const [draftStop, setDraftStop] = useState(config.stop)
  const [rowsDraft, setRowsDraft] = useState(() =>
    rowsDraftFromConfig(config.arrivals.rows)
  )
  const [draftBusStop, setDraftBusStop] = useState(config.bus.stop)
  const [servingBusRoutes, setServingBusRoutes] = useState<readonly string[]>(
    []
  )
  const [discardedBusRoutes, setDiscardedBusRoutes] = useState<readonly string[]>(
    []
  )

  if (config.stop !== draftStop) {
    setDraftStop(config.stop)
    setRowsDraft(rowsDraftFromConfig(config.arrivals.rows))
  }

  if (config.bus.stop !== draftBusStop) {
    setDraftBusStop(config.bus.stop)
    setDiscardedBusRoutes([])
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
  const displayedBusRoutes = config.bus.routes?.length
    ? config.bus.routes
    : servingBusRoutes
  const busPoolRoutes = servingBusRoutes.filter(
    (id) =>
      !displayedBusRoutes.includes(id) && !discardedBusRoutes.includes(id)
  )
  const busRouteItems = useMemo(
    () =>
      [...new Set([...displayedBusRoutes, ...busPoolRoutes])].map((id) => ({
        id,
        label: id,
      })),
    [busPoolRoutes, displayedBusRoutes]
  )
  const busRoutesCustom =
    Boolean(config.bus.routes?.length) &&
    !sameChipOrder(config.bus.routes ?? [], servingBusRoutes)
  const segments = hideTrigger ? [] : segmentsProp

  useEffect(() => {
    const stop = config.bus.stop?.trim()
    if (!stop) {
      setServingBusRoutes([])
      return
    }
    let cancelled = false
    void getBoardBusStopRoutes(stop).then((result) => {
      if (cancelled) return
      setServingBusRoutes(result.ok ? result.routes : [])
    })
    return () => {
      cancelled = true
    }
  }, [config.bus.stop])

  const handleStopNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ stopName: event.target.value })
  }

  const handleRowsChange = (event: ChangeEvent<HTMLInputElement>) => {
    const draft = normalizeRowsDraft(event.target.value)
    setRowsDraft(draft)
    if (!draft) {
      onChange({
        arrivals: {
          rows: undefined,
        },
      })
      return
    }
    onChange({
      arrivals: {
        rows: parseArrivalsRows(draft),
      },
    })
  }

  const persistBusRoutes = (next: readonly string[] | undefined) => {
    const routes =
      !next?.length || sameChipOrder(next, servingBusRoutes)
        ? undefined
        : [...next]
    onChange({
      bus: {
        ...config.bus,
        routes,
      },
    })
  }

  const handleResetBusRoutes = () => {
    persistBusRoutes(undefined)
    setDiscardedBusRoutes([])
  }

  const fields = (
        <div className={cn("flex max-w-3xl flex-col gap-5", hideTrigger ? "pt-1" : "p-4")}>
          {hideTrigger ? null : (
            <>
              <BoardUrlLegend path={legendPath} segments={segments} />
              <p className="text-sm text-muted-foreground">
                See the{" "}
                <a
                  href="/docs/board-url"
                  className="text-foreground underline underline-offset-4"
                >
                  Board URL specification
                </a>
                .
              </p>
            </>
          )}
          {hideTrigger ? null : show(formSettings, "stopName") ? (
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
                value={rowsDraft || rowsPlaceholder}
                onChange={handleRowsChange}
                autoComplete="off"
                spellCheck={false}
                inputMode="numeric"
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

          {show(formSettings, "busStop") ||
          show(formSettings, "busRoutes") ||
          show(formSettings, "busRows") ? (
            <FormGroup title="Bus" roundel="buses">
              {show(formSettings, "busStop") ? (
                <Field>
                  <FieldLabel
                    htmlFor="board-bus-search"
                    setting="busStop"
                    segments={segments}
                    hideRoundel
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
                </Field>
              ) : null}
              {show(formSettings, "busRoutes") ? (
                <Field>
                  <div className="flex items-center justify-between gap-2">
                    <FieldLabel
                      htmlFor="board-bus-routes"
                      setting="busRoutes"
                      segments={segments}
                      hideRoundel
                    >
                      {BOARD_SETTINGS.busRoutes.ui?.label ?? "Bus routes"}
                    </FieldLabel>
                    {busRoutesCustom ? (
                      <button
                        type="button"
                        className="text-sm text-muted-foreground underline underline-offset-4"
                        onClick={handleResetBusRoutes}
                      >
                        Reset
                      </button>
                    ) : null}
                  </div>
                  <BoardChipListEditor
                    id="board-bus-routes"
                    label="Bus routes"
                    selectedIds={displayedBusRoutes}
                    poolIds={busPoolRoutes}
                    items={busRouteItems}
                    onChange={(next) => {
                      persistBusRoutes(next.selected)
                      setDiscardedBusRoutes(
                        servingBusRoutes.filter(
                          (id) =>
                            !next.selected.includes(id) &&
                            !next.pool.includes(id)
                        )
                      )
                    }}
                    renderChip={(item, placement) => (
                      <span aria-hidden>
                        <BusNumberChip
                          label={item.label}
                          className={
                            placement === "pool" ? "opacity-70" : undefined
                          }
                        />
                      </span>
                    )}
                  />
                </Field>
              ) : null}
              {show(formSettings, "busRows") ? (
                <Field>
                  <FieldLabel
                    htmlFor="board-bus-rows"
                    setting="busRows"
                    segments={segments}
                    hideRoundel
                  >
                    {BOARD_SETTINGS.busRows.ui?.label ?? "Bus rows"}
                  </FieldLabel>
                  <NumberField
                    id="board-bus-rows"
                    min={0}
                    max={16}
                    value={config.bus.rows}
                    fallback={BOARD_SETTINGS.busRows.defaultValue}
                    onChange={(rows) =>
                      onChange({ bus: { ...config.bus, rows } })
                    }
                  />
                  <Help>{BOARD_SETTINGS.busRows.ui?.help}</Help>
                </Field>
              ) : null}
            </FormGroup>
          ) : null}

          {show(formSettings, "riverStop") || show(formSettings, "riverRows") ? (
            <FormGroup title="River" roundel="river">
              {show(formSettings, "riverStop") ? (
                <Field>
                  <FieldLabel
                    htmlFor="board-river-search"
                    setting="riverStop"
                    segments={segments}
                    hideRoundel
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
                </Field>
              ) : null}
              {show(formSettings, "riverRows") ? (
                <Field>
                  <FieldLabel
                    htmlFor="board-river-rows"
                    setting="riverRows"
                    segments={segments}
                    hideRoundel
                  >
                    {BOARD_SETTINGS.riverRows.ui?.label ?? "River rows"}
                  </FieldLabel>
                  <NumberField
                    id="board-river-rows"
                    min={0}
                    max={16}
                    value={config.river.rows}
                    fallback={BOARD_SETTINGS.riverRows.defaultValue}
                    onChange={(rows) =>
                      onChange({ river: { ...config.river, rows } })
                    }
                  />
                  <Help>{BOARD_SETTINGS.riverRows.ui?.help}</Help>
                </Field>
              ) : null}
            </FormGroup>
          ) : null}

          {show(formSettings, "cycleDocks") ||
          show(formSettings, "cycleSurface") ||
          show(formSettings, "cycleTiles") ? (
            <FormGroup title="Cycle" roundel="cycles">
              {show(formSettings, "cycleDocks") ? (
                <Field>
                  <FieldLabel
                    htmlFor="board-cycle-docks"
                    setting="cycleDocks"
                    segments={segments}
                    hideRoundel
                  >
                    {BOARD_SETTINGS.cycleDocks.ui?.label ?? "Cycle docks"}
                  </FieldLabel>
                  <BoardCycleDockPicker
                    key={config.stop ?? "cycle-docks"}
                    id="board-cycle-docks"
                    stopId={config.stop}
                    docks={config.cycle.docks}
                    onChange={(docks) =>
                      onChange({
                        cycle: {
                          ...config.cycle,
                          docks: docks.length > 0 ? [...docks] : undefined,
                        },
                      })
                    }
                  />
                </Field>
              ) : null}
              {show(formSettings, "cycleSurface") ? (
                <Field>
                  <FieldLabel
                    htmlFor="board-cycle-surface"
                    setting="cycleSurface"
                    segments={segments}
                    hideRoundel
                  >
                    {BOARD_SETTINGS.cycleSurface.ui?.label ?? "Cycle view"}
                  </FieldLabel>
                  <NativeSelect
                    id="board-cycle-surface"
                    value={
                      config.cycle.surface ??
                      BOARD_SETTINGS.cycleSurface.defaultValue
                    }
                    onChange={(value) =>
                      onChange({
                        cycle: {
                          ...config.cycle,
                          surface: value as NonNullable<
                            BoardConfig["cycle"]["surface"]
                          >,
                        },
                      })
                    }
                    options={BOARD_SETTINGS.cycleSurface.ui?.options ?? []}
                  />
                  <Help>{BOARD_SETTINGS.cycleSurface.ui?.help}</Help>
                </Field>
              ) : null}
              {show(formSettings, "cycleTiles") ? (
                <Field>
                  <FieldLabel
                    htmlFor="board-cycle-tiles"
                    setting="cycleTiles"
                    segments={segments}
                    hideRoundel
                  >
                    {BOARD_SETTINGS.cycleTiles.ui?.label ?? "Cycle tiles"}
                  </FieldLabel>
                  <NumberField
                    id="board-cycle-tiles"
                    min={1}
                    max={16}
                    value={config.cycle.tiles}
                    fallback={BOARD_SETTINGS.cycleTiles.defaultValue}
                    onChange={(tiles) =>
                      onChange({ cycle: { ...config.cycle, tiles } })
                    }
                  />
                  <Help>{BOARD_SETTINGS.cycleTiles.ui?.help}</Help>
                </Field>
              ) : null}
            </FormGroup>
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

          <div className="mt-8 space-y-5">
            <Field>
              <BoardSlotEditor
                slots={config.slots}
                onChange={(slots) => onChange({ slots })}
              />
            </Field>

            {show(formSettings, "behaviour") ? (
              <Field>
                <DescribedSelect
                  id="board-behaviour"
                  ariaLabel={BOARD_SETTINGS.behaviour.ui?.label ?? "Behaviour"}
                  value={config.behaviour}
                  onChange={(value) =>
                    onChange({
                      behaviour: value as BoardConfig["behaviour"],
                    })
                  }
                  options={BOARD_SETTINGS.behaviour.ui?.options ?? []}
                />
              </Field>
            ) : null}
          </div>
        </div>
  )

  if (hideTrigger) return fields

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
        {fields}
      </CollapsibleContent>
    </Collapsible>
  )
}
