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
import type { ExplorerTubeRailPoint } from "@/lib/tfl/explorer/common"

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
  placePanel: (kind: BoardPanelKind, index: number) => void
  /** R: move a part within the one "On the board" list (see placeOnBoard). */
  placeOnBoard: (kind: BoardPanelKind, index: number) => void
  /** R: the part whose editor page is open, or null for the list. */
  editing: BoardPanelKind | null
  openEditor: (kind: BoardPanelKind | null) => void
  /** The bus editor's "Add a bus stop" search is open; back closes it first. */
  busAdding: boolean
  setBusAdding: (adding: boolean) => void
  /** Bus stop ids on the board (`b.stop`), in order. */
  busStops: readonly string[]
  /** True once the user chose the stops; false while they are the nearest. */
  busStopsCustom: boolean
  setBusStops: (ids: readonly string[]) => void
  /** Back to the nearest stops to the default place. */
  resetBusStops: () => void
  /** Routes shown (`b.routes`); undefined shows every route. */
  busRoutes: readonly string[] | undefined
  setBusRoutes: (routes: readonly string[] | undefined) => void
  /** Dock ids on the board (`c.docks`), in order. */
  cycleDocks: readonly string[]
  /** True once the user chose the docks; false while they are the nearest. */
  cycleDocksCustom: boolean
  setCycleDocks: (ids: readonly string[]) => void
  /** The editors' search (the homepage's): stations, their hubs, and where the board's station is. */
  search: {
    stations: readonly ExplorerTubeRailPoint[]
    hubStationIds: Readonly<Record<string, string>>
    near: { lat: number; lon: number } | undefined
  }
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
