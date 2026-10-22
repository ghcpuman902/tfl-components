/**
 * Shared state for the Customise variants (C, D, R). Pure: no React / browser.
 * Every variant edits the same builder draft through these functions, so a
 * board made in one variant writes the same URL and opens the same in the
 * others. The default panel does not use the layout unless a variant set it.
 */

import { resolveBoardSlots, type BoardPanelKind } from "@/lib/tfl/board-panels"
import type {
  BoardCustomiseLayout,
  BoardCustomisePanel,
  BoardPanelColumn,
  BoardSetupDraft,
} from "@/lib/tfl/board-setup-state"
import { statusLineOrderFromDraft } from "@/lib/tfl/board-setup-state"
import type { BoardConfig } from "@/lib/tfl/board-url-state"

/** Rows in the Customise list, before the user moves anything. */
export const CUSTOMISE_PANEL_ORDER: readonly BoardPanelKind[] = [
  "rail",
  "bus",
  "status",
  "river",
  "cycle",
]

export const CUSTOMISE_PANEL_LABEL: Record<BoardPanelKind, string> = {
  rail: "Trains",
  bus: "Buses",
  status: "Line status",
  river: "River boats",
  cycle: "Cycle hire",
}

const UNIT: Record<BoardPanelKind, readonly [string, string]> = {
  rail: ["row per direction", "rows per direction"],
  bus: ["row", "rows"],
  river: ["row", "rows"],
  cycle: ["tile", "tiles"],
  status: ["tile", "tiles"],
}

/** The board's own default for each panel's height (0 is Full). */
export const CUSTOMISE_HEIGHT_DEFAULT: Record<BoardPanelKind, number> = {
  rail: 3,
  bus: 3,
  river: 3,
  cycle: 6,
  status: 0,
}

const HEIGHT_MAX: Record<BoardPanelKind, number> = {
  rail: 8,
  bus: 8,
  river: 8,
  cycle: 12,
  status: 8,
}

/** Cycle tiles have no "show all" value, so their stepper tops out at 12. */
const hasFull = (kind: BoardPanelKind) => kind !== "cycle"

/** Stepper values, shortest first; Full (0) is the top end where it exists. */
export const heightSteps = (kind: BoardPanelKind): readonly number[] => {
  const steps = Array.from(
    { length: HEIGHT_MAX[kind] },
    (_, index) => index + 1
  )
  return hasFull(kind) ? [...steps, 0] : steps
}

export const heightLabel = (kind: BoardPanelKind, height: number): string => {
  if (height === 0 && hasFull(kind)) return "Full"
  const [one, many] = UNIT[kind]
  return `${height} ${height === 1 ? one : many}`
}

export const stepHeight = (
  kind: BoardPanelKind,
  height: number,
  direction: -1 | 1
): number => {
  const steps = heightSteps(kind)
  const at = steps.indexOf(height)
  const from = at === -1 ? steps.indexOf(CUSTOMISE_HEIGHT_DEFAULT[kind]) : at
  const next = Math.max(0, Math.min(steps.length - 1, from + direction))
  return steps[next] ?? height
}

export const canStepHeight = (
  kind: BoardPanelKind,
  height: number,
  direction: -1 | 1
): boolean => stepHeight(kind, height, direction) !== height

const defaultColumn = (kind: BoardPanelKind): BoardPanelColumn =>
  kind === "status" ? "p2" : "p1"

const configHeight = (
  config: BoardConfig,
  kind: BoardPanelKind
): number | undefined => {
  if (kind === "rail") {
    return typeof config.arrivals.rows === "number"
      ? config.arrivals.rows
      : undefined
  }
  if (kind === "bus") return config.bus.rows
  if (kind === "river") return config.river.rows
  if (kind === "cycle") return config.cycle.tiles
  return config.status.tiles
}

/** The layout a board already has: its slots, stack order and heights. */
export const layoutFromConfig = (config: BoardConfig): BoardCustomiseLayout => {
  const slots = resolveBoardSlots(config.slots.p1, config.slots.p2)
  const panels: BoardCustomisePanel[] = [
    ...slots.p1.map((kind) => ({ kind, column: "p1" as const, on: true })),
    ...slots.p2.map((kind) => ({ kind, column: "p2" as const, on: true })),
  ]
  for (const kind of CUSTOMISE_PANEL_ORDER) {
    if (!panels.some((panel) => panel.kind === kind)) {
      panels.push({ kind, column: defaultColumn(kind), on: false })
    }
  }
  const heights: BoardCustomiseLayout["heights"] = {}
  for (const kind of CUSTOMISE_PANEL_ORDER) {
    const height = configHeight(config, kind)
    if (height !== undefined) heights[kind] = height
  }
  return { panels, heights, solo: null }
}

/** Whether the board has what it needs to draw this panel (else it shows the demo). */
export const panelHasTarget = (
  config: BoardConfig,
  kind: BoardPanelKind
): boolean => {
  if (kind === "rail") return Boolean(config.stop?.trim())
  if (kind === "bus") return Boolean(config.bus.stop?.trim())
  if (kind === "river") return Boolean(config.river.stop?.trim())
  if (kind === "cycle") return (config.cycle.docks?.length ?? 0) > 0
  return true
}

export const panelShown = (
  layout: BoardCustomiseLayout,
  kind: BoardPanelKind
): boolean =>
  layout.solo
    ? layout.solo === kind
    : (layout.panels.find((panel) => panel.kind === kind)?.on ?? false)

/**
 * Write the layout into a config: slots from what is shown (panels still
 * waiting for a nearby stop are left out, so the link never falls back to the
 * demo), and heights. "Only show this" puts that one panel in a single column.
 */
export const applyLayoutToConfig = (
  config: BoardConfig,
  layout: BoardCustomiseLayout
): BoardConfig => {
  const shown = layout.panels.filter(
    (panel) =>
      panelShown(layout, panel.kind) && panelHasTarget(config, panel.kind)
  )
  let p1 = shown
    .filter((panel) => panel.column === "p1")
    .map((panel) => panel.kind)
  let p2 = shown
    .filter((panel) => panel.column === "p2")
    .map((panel) => panel.kind)
  if (layout.solo || p1.length === 0) {
    p1 = [...p1, ...p2]
    p2 = []
  }
  const height = (kind: BoardPanelKind) => layout.heights[kind]
  const arrivals = { ...config.arrivals }
  if (height("rail") !== undefined && config.view !== "glance") {
    arrivals.rows = height("rail")
  }
  return {
    ...config,
    slots: { p1, p2 },
    arrivals,
    bus:
      height("bus") !== undefined
        ? { ...config.bus, rows: height("bus") }
        : config.bus,
    river:
      height("river") !== undefined
        ? { ...config.river, rows: height("river") }
        : config.river,
    cycle:
      height("cycle") !== undefined
        ? { ...config.cycle, tiles: Math.max(1, height("cycle") ?? 1) }
        : config.cycle,
    status:
      height("status") !== undefined
        ? { ...config.status, tiles: height("status") }
        : config.status,
  }
}

/** Settings the layout owns; a variant moves them out of the builder's overrides. */
export const withoutLayoutSettings = (
  overrides: Partial<BoardConfig>
): Partial<BoardConfig> => {
  const next = { ...overrides }
  delete next.slots
  if (next.arrivals) next.arrivals = { ...next.arrivals, rows: undefined }
  if (next.bus) next.bus = { ...next.bus, rows: undefined }
  if (next.river) next.river = { ...next.river, rows: undefined }
  if (next.cycle) next.cycle = { ...next.cycle, tiles: undefined }
  if (next.status) next.status = { ...next.status, tiles: undefined }
  return next
}

const visibleCount = (layout: BoardCustomiseLayout) =>
  layout.solo ? 1 : layout.panels.filter((panel) => panel.on).length

/** False for the last panel still shown: a board needs at least one. */
export const canHidePanel = (
  layout: BoardCustomiseLayout,
  kind: BoardPanelKind
): boolean =>
  !panelShown(layout, kind) || layout.solo !== null || visibleCount(layout) > 1

/**
 * Eye: put a panel on the board or take it off. While "Only show this" is on,
 * showing another panel ends it, so the eye always means "on the board".
 */
export const setPanelOn = (
  layout: BoardCustomiseLayout,
  kind: BoardPanelKind,
  on: boolean
): BoardCustomiseLayout => {
  if (!on && !canHidePanel(layout, kind)) return layout
  const panels = layout.panels.map((panel) =>
    panel.kind === kind ? { ...panel, on } : panel
  )
  if (layout.solo === null) return { ...layout, panels }
  if (!on && layout.solo !== kind) return { ...layout, panels }
  return { ...layout, panels, solo: null }
}

/** ⋯ "Only show this": toggles; the other panels keep their own on/off. */
export const toggleSoloPanel = (
  layout: BoardCustomiseLayout,
  kind: BoardPanelKind
): BoardCustomiseLayout => {
  if (layout.solo === kind) return { ...layout, solo: null }
  return {
    ...layout,
    solo: kind,
    panels: layout.panels.map((panel) =>
      panel.kind === kind ? { ...panel, on: true } : panel
    ),
  }
}

export const setPanelColumn = (
  layout: BoardCustomiseLayout,
  kind: BoardPanelKind,
  column: BoardPanelColumn
): BoardCustomiseLayout => ({
  ...layout,
  panels: layout.panels.map((panel) =>
    panel.kind === kind ? { ...panel, column } : panel
  ),
})

export const setPanelHeight = (
  layout: BoardCustomiseLayout,
  kind: BoardPanelKind,
  height: number
): BoardCustomiseLayout => ({
  ...layout,
  heights: { ...layout.heights, [kind]: height },
})

export const panelHeight = (
  layout: BoardCustomiseLayout,
  kind: BoardPanelKind
): number => layout.heights[kind] ?? CUSTOMISE_HEIGHT_DEFAULT[kind]

/** Wide column, Narrow column, Not on the board: each in stack order. */
export const layoutSections = (layout: BoardCustomiseLayout) => ({
  wide: layout.panels.filter((panel) => panel.on && panel.column === "p1"),
  narrow: layout.panels.filter((panel) => panel.on && panel.column === "p2"),
  off: layout.panels.filter((panel) => !panel.on),
})

/* ---------- status priority (Q3, Q4, Q5) ---------- */

export const statusPriority = (draft: BoardSetupDraft): readonly string[] =>
  statusLineOrderFromDraft(draft)

/** The user edited the order: keep it, and remember the station it was made under. */
export const withStatusOrder = (
  draft: BoardSetupDraft,
  order: readonly string[]
): BoardSetupDraft => ({
  ...draft,
  statusOrder: [...new Set(order)],
  statusOrderStopId: draft.stopId,
})

export const placeLine = (
  list: readonly string[],
  lineId: string,
  index: number
): string[] => {
  const next = list.filter((id) => id !== lineId)
  next.splice(Math.max(0, Math.min(index, next.length)), 0, lineId)
  return next
}

export const moveLineToTop = (list: readonly string[], lineId: string) =>
  placeLine(list, lineId, 0)

export const removeLine = (list: readonly string[], lineId: string) =>
  list.filter((id) => id !== lineId)

export const addLine = (list: readonly string[], lineId: string) => [
  ...removeLine(list, lineId),
  lineId,
]

/** Q4: the order is the user's and the station changed since it was made. */
export const statusStationPending = (draft: BoardSetupDraft): boolean =>
  draft.statusOrder !== null && draft.statusOrderStopId !== draft.stopId

export type StatusOrderUndo = Pick<
  BoardSetupDraft,
  "statusOrder" | "statusOrderStopId"
>

/** "Use the lines at X": follow the station again, keeping what Undo needs. */
export const followStationStatusLines = (
  draft: BoardSetupDraft
): { draft: BoardSetupDraft; undo: StatusOrderUndo } => ({
  draft: { ...draft, statusOrder: null, statusOrderStopId: null },
  undo: {
    statusOrder: draft.statusOrder,
    statusOrderStopId: draft.statusOrderStopId,
  },
})

export const undoStationStatusLines = (
  draft: BoardSetupDraft,
  undo: StatusOrderUndo
): BoardSetupDraft => ({ ...draft, ...undo })

/**
 * A station pick. The default panel replaces the status order (today's
 * behaviour); the variants keep the user's order (Q4) and offer "Use the lines
 * at X". Either way the nearby ids are cleared for a fresh lookup.
 */
export const draftForStationPick = (
  current: BoardSetupDraft,
  pick: {
    stopId: string
    stopName: string | null
    lineIds: readonly string[]
    extraStatusLineIds: readonly string[]
    keepStatusOrder: boolean
  }
): BoardSetupDraft => ({
  ...current,
  continueWithoutStop: false,
  stopId: pick.stopId,
  stopName: pick.stopName,
  lineIds: [...pick.lineIds],
  statusLineIds: [...pick.extraStatusLineIds],
  busStopId: null,
  riverStopId: null,
  cycleDockIds: [],
  statusOrder: pick.keepStatusOrder ? current.statusOrder : null,
  statusOrderStopId: pick.keepStatusOrder ? current.statusOrderStopId : null,
})

/**
 * First edit in a variant: take the layout the board already has. A
 * "status only" board becomes Line status with "Only show this".
 */
export const draftWithLayout = (
  draft: BoardSetupDraft,
  config: BoardConfig
): BoardSetupDraft => {
  if (draft.layout) return draft
  if (draft.continueWithoutStop) {
    const base = layoutFromConfig({
      ...config,
      slots: { p1: ["rail", "bus"], p2: ["status"] },
    })
    return {
      ...draft,
      continueWithoutStop: false,
      layout: { ...base, solo: "status" },
    }
  }
  return { ...draft, layout: layoutFromConfig(config) }
}

/** River and cycle panels need their nearby lookup; keep the draft's modes in step. */
export const nearbyModesForLayout = (
  draft: BoardSetupDraft,
  layout: BoardCustomiseLayout
): BoardSetupDraft["nearbyModes"] => {
  const wanted = new Set(draft.nearbyModes)
  wanted.add("bus")
  for (const kind of ["river", "cycle"] as const) {
    if (
      panelShown(layout, kind) ||
      layout.panels.find((p) => p.kind === kind)?.on
    ) {
      wanted.add(kind)
    }
  }
  return (["bus", "river", "cycle"] as const).filter((mode) => wanted.has(mode))
}

/** True when a form change edits something the layout owns (slots or a height). */
export const touchesLayoutSettings = (next: Partial<BoardConfig>): boolean =>
  next.slots !== undefined ||
  next.arrivals?.rows !== undefined ||
  next.bus?.rows !== undefined ||
  next.river?.rows !== undefined ||
  next.cycle?.tiles !== undefined ||
  next.status?.tiles !== undefined

/**
 * Back to the default panel's form: hand the layout's slots and heights over
 * as plain overrides, so the board does not change when the layout is dropped.
 */
export const layoutSettingsAsOverrides = (
  config: BoardConfig
): Partial<BoardConfig> => ({
  slots: config.slots,
  arrivals: { rows: config.arrivals.rows },
  bus: { rows: config.bus.rows },
  river: { rows: config.river.rows },
  cycle: { tiles: config.cycle.tiles },
  status: { tiles: config.status.tiles },
})
