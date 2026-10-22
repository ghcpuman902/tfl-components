import type { CustomiseEventLogger } from "@/lib/analytics/customise-events"
import type { RailArrivalsLine } from "@/lib/tfl/arrivals-prepare"
import type { BoardPanelKind } from "@/lib/tfl/board-panels"
import type {
  BoardCustomiseLayout,
  BoardPanelColumn,
} from "@/lib/tfl/board-setup-state"
import type { BoardStationLineGroup } from "@/lib/tfl/board-station-lines"
import type { BoardStationSearchItem } from "@/lib/tfl/board-station-names"
import type { CustomiseVariant } from "@/lib/tfl/board-customise-variant"

/** Nearby stop for a panel: found, still looking, or none near this station. */
export type PanelTarget = "ready" | "loading" | "none"

/** Everything a Customise variant reads and does; built once by the builder. */
export type CustomiseController = {
  variant: Exclude<CustomiseVariant, "panel">
  log: CustomiseEventLogger
  /** Board link and its absolute URL (the share card's href). */
  href: string
  stations: readonly BoardStationSearchItem[]
  stopId: string | null
  stationName: string
  stationContext: string
  servingLines: readonly RailArrivalsLine[]
  lineGroups: readonly BoardStationLineGroup[] | undefined
  railLines: readonly string[]
  pickStation: (stopId: string) => void
  layout: BoardCustomiseLayout
  panelTarget: (kind: BoardPanelKind) => PanelTarget
  setPanelOn: (kind: BoardPanelKind, on: boolean) => void
  toggleSolo: (kind: BoardPanelKind) => void
  setPanelColumn: (kind: BoardPanelKind, column: BoardPanelColumn) => void
  setPanelHeight: (kind: BoardPanelKind, height: number) => void
  setRailLines: (lineIds: readonly string[]) => void
  statusLines: readonly string[]
  /** How the status order changed; drag / move-to-top count as a reorder. */
  setStatusLines: (
    lineIds: readonly string[],
    how: "drag" | "top" | "add" | "remove"
  ) => void
  statusFollows: boolean
  statusPending: boolean
  followStationLines: () => void
  undoStationLines: (() => void) | null
  statusOnlyThese: boolean
  setStatusOnlyThese: (value: boolean) => void
  unattended: boolean
  setUnattended: (value: boolean) => void
  glance: boolean
  setGlance: (value: boolean) => void
  done: () => void
}
