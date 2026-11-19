"use client"

import { useState, type ReactNode } from "react"
import { Undo2Icon } from "lucide-react"
import { OrderedLineList } from "@/components/board/customise/ordered-line-list"
import {
  BoardStationHeader,
  HeightStepper,
  PanelTargetNote,
  SectionHeading,
  StatusDots,
  TEXT_LINK,
  statusOnBoard,
} from "@/components/board/customise/parts"
import type { CustomiseController } from "@/components/board/customise/types"
import { useCycleDocks } from "@/components/board/customise/use-cycle-docks"
import {
  DockMarker,
  PlaceSearch,
  dockCounts,
} from "@/components/home/place-search"
import {
  addLine,
  moveLineToTop,
  panelShown,
  placeLine,
  removeLine,
} from "@/lib/tfl/board-customise"
import { formatBikePointId } from "@/lib/tfl/board-panels"
import type { ExplorerPoint } from "@/lib/tfl/explorer-point-normalise"
import type { PlaceHit } from "@/lib/tfl/homepage-live/search"
import type { SearchMode } from "@/lib/tfl/homepage-live/search-mode"
import { LINE_ORDER } from "tfl-ts"

/** The homepage search, limited to one kind of place, at the top of an editor. */
export const EditorSearch = ({
  api,
  mode,
  placeholder,
  chosenIds,
  onSelect = () => undefined,
  onSelectDock,
}: {
  api: CustomiseController
  mode: SearchMode
  placeholder: string
  chosenIds?: readonly string[]
  onSelect?: (hit: PlaceHit) => void
  onSelectDock?: (dock: ExplorerPoint) => void
}) => (
  <PlaceSearch
    stations={api.search.stations}
    hubStationIds={api.search.hubStationIds}
    anchor={api.search.near}
    mode={mode}
    placeholder={placeholder}
    chosenIds={chosenIds}
    onSelect={onSelect}
    onSelectDock={onSelectDock}
  />
)

/** A picked station as the Board's stop: its own id, else a member the Board knows. */
const pickStationHit = (api: CustomiseController, hit: PlaceHit) => {
  if (hit.kind !== "station") return
  const known = (id: string) =>
    api.stations.some(
      (station) => station.id === id || station.aliasIds.includes(id)
    )
  api.pickStation([hit.id, ...hit.stopIds].find(known) ?? hit.id)
}

/** Station field and the Board's header for it. */
const StationField = ({
  api,
  children,
}: {
  api: CustomiseController
  children?: ReactNode
}) => (
  <div className="-mt-4 space-y-3">
    <EditorSearch
      api={api}
      mode="rail"
      placeholder="Station"
      onSelect={(hit) => pickStationHit(api, hit)}
    />
    {api.stopId ? <BoardStationHeader name={api.stationName} /> : null}
    {children}
  </div>
)

/** Trains: the station, its lines in board order, Hidden, Height. */
export const TrainsEditor = ({ api }: { api: CustomiseController }) => {
  const serving = api.servingLines.map((line) => line.lineId)
  const on = api.railLines.length > 0 ? api.railLines : serving
  const hidden = serving.filter((id) => !on.includes(id))
  return (
    <>
      <StationField api={api} />
      <PanelTargetNote api={api} kind="rail" />
      {on.length > 0 ? (
        <section aria-labelledby="customise-rail-lines" className="space-y-1">
          <SectionHeading id="customise-rail-lines">
            Lines, in board order
          </SectionHeading>
          <OrderedLineList
            label="Lines, in board order"
            ids={on}
            flush
            onPlace={(id, index) => api.setRailLines(placeLine(on, id, index))}
            onTop={(id) => api.setRailLines(moveLineToTop(on, id))}
            hidden={{
              hint: "Drag a line here to hide it",
              ids: hidden,
              canHide: () => on.length > 1,
              onHide: (id) => api.setRailLines(removeLine(on, id)),
              onShow: (id) => api.setRailLines(addLine(on, id)),
            }}
          />
        </section>
      ) : null}
      {panelShown(api.layout, "rail") ? (
        <HeightStepper api={api} kind="rail" />
      ) : null}
    </>
  )
}

/** Cycle hire: add a dock, the docks in board order, Height. */
export const CycleEditor = ({ api }: { api: CustomiseController }) => {
  const ids = api.cycleDocks
  const { docks } = useCycleDocks(ids)
  const item = (id: string) => {
    const dock = docks[ids.indexOf(id)]
    return {
      name: dock?.name ?? "this dock",
      body: (
        <span className="flex min-h-14 min-w-0 flex-1 items-center gap-3 py-2">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-base">{dock?.name ?? " "}</span>
            <span className="block truncate text-sm text-muted-foreground">
              {dock ? dockCounts(dock) : " "}
            </span>
          </span>
          {dock ? <DockMarker dock={dock} /> : null}
        </span>
      ),
    }
  }
  return (
    <>
      <div className="-mt-4">
        <EditorSearch
          api={api}
          mode="cycle"
          placeholder="Add a dock"
          chosenIds={ids.map(formatBikePointId)}
          onSelectDock={(dock) => api.setCycleDocks([...ids, dock.id])}
        />
      </div>
      {ids.length > 0 ? (
        <section aria-labelledby="customise-cycle-docks" className="space-y-1">
          <SectionHeading id="customise-cycle-docks">
            Docks, in board order
          </SectionHeading>
          <OrderedLineList
            label="Docks, in board order"
            ids={ids}
            flush
            item={item}
            onPlace={(id, index) => api.setCycleDocks(placeLine(ids, id, index))}
            onRemove={(id) => api.setCycleDocks(removeLine(ids, id))}
          />
        </section>
      ) : api.cycleDocksCustom ? (
        <p className="text-sm text-muted-foreground">No dock yet.</p>
      ) : (
        <PanelTargetNote api={api} kind="cycle" />
      )}
      {panelShown(api.layout, "cycle") ? (
        <HeightStepper api={api} kind="cycle" />
      ) : null}
    </>
  )
}

const STATUS_FIRST = 7

/** Line status: the station, its lines first, the rest in your order, Hidden. */
export const StatusEditor = ({ api }: { api: CustomiseController }) => {
  const [all, setAll] = useState(false)
  const on = statusOnBoard(api)
  const shown = all ? on : on.slice(0, STATUS_FIRST)
  const hidden = api.statusOnlyThese
    ? LINE_ORDER.filter((id) => !api.statusLines.includes(id))
    : []
  const hide = (id: string) => {
    api.setStatusLines(removeLine(on, id), "remove")
    if (!api.statusOnlyThese) api.setStatusOnlyThese(true)
  }
  const show = (id: string) => {
    const next = addLine(api.statusLines, id)
    api.setStatusLines(next, "add")
    if (LINE_ORDER.every((line) => next.includes(line)))
      api.setStatusOnlyThese(false)
  }
  return (
    <>
      <StationField api={api}>
        <p className="text-sm text-muted-foreground">
          {api.statusFollows
            ? `Lines at ${api.stationName} first, then your order.`
            : "Your order, top first."}
        </p>
        {api.statusPending ? (
          <button
            type="button"
            className={TEXT_LINK}
            onClick={api.followStationLines}
          >
            Use the lines at {api.stationName}
          </button>
        ) : api.undoStationLines ? (
          <button
            type="button"
            className={TEXT_LINK}
            onClick={api.undoStationLines}
          >
            <Undo2Icon className="mr-1.5 size-4" aria-hidden />
            Undo: back to your order
          </button>
        ) : null}
      </StationField>
      <section aria-labelledby="customise-status-on" className="space-y-1">
        <div className="flex items-center justify-between gap-3">
          <SectionHeading id="customise-status-on">On the board</SectionHeading>
          <span className="pt-2">
            <StatusDots lines={on} />
          </span>
        </div>
        <OrderedLineList
          label="Line status order"
          ids={shown}
          flush
          onPlace={(id, index) =>
            api.setStatusLines(placeLine(on, id, index), "drag")
          }
          onTop={(id) => api.setStatusLines(moveLineToTop(on, id), "top")}
          footer={
            on.length > STATUS_FIRST ? (
              <p className="flex min-h-11 items-center justify-between text-sm text-muted-foreground">
                <span>
                  {all ? `${on.length} lines` : `${on.length - shown.length} more lines`}
                </span>
                <button
                  type="button"
                  className="min-h-11 text-foreground underline underline-offset-4"
                  onClick={() => setAll((value) => !value)}
                >
                  {all ? "Show fewer" : `Show all ${on.length}`}
                </button>
              </p>
            ) : null
          }
          hidden={{
            hint: "Drag a line here to leave it out",
            ids: hidden,
            canHide: () => on.length > 1,
            onHide: hide,
            onShow: show,
          }}
        />
      </section>
    </>
  )
}
