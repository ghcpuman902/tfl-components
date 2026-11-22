"use client"

import {
  useRef,
  type CSSProperties,
  type DOMAttributes,
  type ReactNode,
  type Ref,
} from "react"
import { PencilIcon, PlusIcon } from "lucide-react"
import { BusEditor } from "@/components/board/customise/bus-editor"
import {
  DragGrip,
  GRIP_SLOT,
  PRESS_SURFACE,
  useDragOrder,
} from "@/components/board/customise/drag-order"
import {
  CycleEditor,
  StatusEditor,
  TrainsEditor,
} from "@/components/board/customise/editors"
import {
  ICON_BUTTON,
  PanelMenu,
  PanelRoundel,
  SectionHeading,
  SoloLine,
  StatusDots,
  lineName,
  panelSummary,
  statusOnBoard,
} from "@/components/board/customise/parts"
import { DisplayRows, PanelBody } from "@/components/board/customise/sections"
import type { CustomiseController } from "@/components/board/customise/types"
import {
  stopsByName,
  useBusStops,
} from "@/components/board/customise/use-bus-stops"
import { useCycleDocks } from "@/components/board/customise/use-cycle-docks"
import { BusNumberChip } from "@/components/tfl/arrivals/bus-number-chip"
import { StopLetterBadge } from "@/components/tfl/arrivals/stop-letter-badge"
import { LineBadge } from "@/components/tfl/brand/line-badge"
import {
  CUSTOMISE_PANEL_LABEL,
  canHidePanel,
  layoutSections,
  onBoardPanels,
} from "@/lib/tfl/board-customise"
import type { BoardPanelKind } from "@/lib/tfl/board-panels"
import { cn } from "@/lib/utils"

const SUB = "flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground"

/** Trains: the station, then its line chips in board order. */
const TrainsSummary = ({ api }: { api: CustomiseController }) => {
  const ids =
    api.railLines.length > 0
      ? api.railLines
      : api.servingLines.map((line) => line.lineId)
  return (
    <>
      <span className={SUB}>
        <span className="truncate">{api.stationName}</span>
      </span>
      {ids.length > 0 ? (
        <span className="mb-1 flex flex-wrap gap-1">
          {ids.map((id) => (
            <LineBadge key={id} lineId={id} name={lineName(id)} />
          ))}
        </span>
      ) : null}
    </>
  )
}

/** Cycle hire: the docks' names, in board order. */
const CycleSummary = ({ api }: { api: CustomiseController }) => {
  const { docks, ready } = useCycleDocks(api.cycleDocks)
  const names = docks.flatMap((dock) => (dock ? [dock.name] : []))
  return (
    <span className={SUB}>
      <span className="truncate">
        {ready && names.length > 0 ? names.join(", ") : " "}
      </span>
    </span>
  )
}

/** Buses: the stops' names with a letter per stop, then the routes shown. */
const BusesSummary = ({ api }: { api: CustomiseController }) => {
  const { stops, routes, ready } = useBusStops(api.busStops)
  const shown = routes.filter(
    (route) => !api.busRoutes || api.busRoutes.includes(route)
  )
  // Both lines keep their height while the stops are read.
  if (!ready)
    return (
      <>
        <span className={SUB}>{" "}</span>
        <span aria-hidden className="mt-1 mb-1 block h-5" />
      </>
    )
  return (
    <>
      <span className={cn(SUB, "flex-wrap gap-y-0")}>
        {stopsByName(stops).map((group) => (
          <span
            key={group.name}
            className="inline-flex min-w-0 max-w-full items-center gap-1.5"
          >
            <span className="min-w-0 truncate">{group.name}</span>
            {group.letters.map((letter) => (
              <StopLetterBadge
                key={letter}
                letter={letter}
                size="sm"
                className="shrink-0"
              />
            ))}
          </span>
        ))}
      </span>
      {shown.length > 0 ? (
        <span className="mt-1 mb-1 flex flex-wrap gap-1">
          {shown.map((route) => (
            <BusNumberChip key={route} label={route} />
          ))}
        </span>
      ) : null}
    </>
  )
}

const RowSummary = ({
  api,
  kind,
  off,
}: {
  api: CustomiseController
  kind: BoardPanelKind
  off: boolean
}) => {
  const ready = api.panelTarget(kind) === "ready"
  if (!off && ready && kind === "rail") return <TrainsSummary api={api} />
  if (!off && ready && kind === "bus" && api.busStops.length > 0)
    return <BusesSummary api={api} />
  if (!off && ready && kind === "cycle" && api.cycleDocks.length > 0)
    return <CycleSummary api={api} />
  if (!off && kind === "status")
    return (
      <span className="mt-1 mb-1 block">
        <StatusDots lines={statusOnBoard(api)} />
      </span>
    )
  const summary = panelSummary(api, kind, { hiddenRow: off })
  return summary ? (
    <span className={SUB}>
      <span className="truncate">{summary}</span>
    </span>
  ) : null
}

/**
 * One part: roundel · name and what it shows · pencil · ⋯. Tap the row or
 * the pencil to open its editor; hold the row to drag it. A part off the
 * board is the same row, dragged up into the list or put back with +.
 */
const PartRow = ({
  api,
  kind,
  rowRef,
  press,
  grip,
  motion,
  off = false,
}: {
  api: CustomiseController
  kind: BoardPanelKind
  rowRef?: Ref<HTMLLIElement>
  press?: DOMAttributes<HTMLDivElement>
  grip?: ReactNode
  motion?: { className?: string; style?: CSSProperties }
  off?: boolean
}) => {
  const label = CUSTOMISE_PANEL_LABEL[kind]
  return (
    <li
      ref={rowRef}
      className={cn("border-b border-border last:border-b-0", motion?.className)}
      style={motion?.style}
      data-panel={kind}
    >
      <div className={cn("flex items-center", PRESS_SURFACE)} {...press}>
        {grip ?? <span aria-hidden className={GRIP_SLOT} />}
        <button
          type="button"
          className={cn(
            "flex min-h-12 min-w-0 flex-1 items-center gap-2 py-1 text-left",
            off && "text-muted-foreground"
          )}
          onClick={() => api.openEditor(kind)}
        >
          <PanelRoundel kind={kind} />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">
              {label}
              {api.layout.solo === kind ? " · only this" : ""}
            </span>
            <RowSummary api={api} kind={kind} off={off} />
          </span>
        </button>
        {off ? (
          <button
            type="button"
            aria-label={`Add ${label} to the board`}
            className={ICON_BUTTON}
            onClick={() => api.setPanelOn(kind, true)}
          >
            <PlusIcon className="size-5" aria-hidden />
          </button>
        ) : (
          <>
            <button
              type="button"
              aria-label={`Edit ${label}`}
              className={ICON_BUTTON}
              onClick={() => api.openEditor(kind)}
            >
              <PencilIcon className="size-5" aria-hidden />
            </button>
            <PanelMenu api={api} kind={kind} takeOff />
          </>
        )}
      </div>
    </li>
  )
}

/** On the board (drag to reorder), then Off the board (drag here; drag up or + to add back). */
const BoardParts = ({ api }: { api: CustomiseController }) => {
  const on = onBoardPanels(api.layout)
  const off = layoutSections(api.layout).off
  const dropRef = useRef<HTMLDivElement | null>(null)
  const place = (kind: string, index: number) =>
    api.placeOnBoard(kind as BoardPanelKind, index)
  const { listRef, addRef, row, press, grip, rowMotion, dropping, gap } =
    useDragOrder<HTMLUListElement>({
      ids: on.map((panel) => panel.kind),
      onPlace: place,
      dropZone: {
        ref: dropRef,
        canDrop: (kind) => canHidePanel(api.layout, kind as BoardPanelKind),
        onDrop: (kind) => api.setPanelOn(kind as BoardPanelKind, false),
      },
      // Off rows drag straight up into the list; + still adds at the end.
      adding: { ids: off.map((panel) => panel.kind), onAdd: place },
    })
  // Same row, grip and press either side: Off differs only in its + and summary.
  const partRow = (kind: BoardPanelKind, isOff: boolean) => (
    <PartRow
      key={kind}
      api={api}
      kind={kind}
      rowRef={row(kind)}
      press={press(kind)}
      grip={
        <DragGrip
          name={CUSTOMISE_PANEL_LABEL[kind]}
          {...grip(kind)}
          className="pointer-coarse:w-0"
        />
      }
      motion={rowMotion(kind)}
      off={isOff}
    />
  )
  return (
    <>
      <section aria-labelledby="customise-r-on" className="space-y-1">
        <SectionHeading id="customise-r-on">On the board</SectionHeading>
        <ul
          ref={listRef}
          className="relative border-y border-border"
          style={gap ? { paddingBottom: gap } : undefined}
        >
          {on.map(({ kind }) => partRow(kind, false))}
        </ul>
      </section>
      <section aria-labelledby="customise-r-off" className="space-y-1 pt-3">
        <SectionHeading id="customise-r-off">Off the board</SectionHeading>
        <div
          ref={dropRef}
          className={cn(
            "mb-0! border border-dashed border-foreground/40 px-3 py-2 text-sm text-muted-foreground",
            dropping && "bg-muted text-foreground"
          )}
        >
          Drag a part here to take it off the board
        </div>
        {off.length > 0 ? (
          <ul
            ref={addRef}
            aria-label="Off the board"
            className="border-b border-border"
          >
            {off.map(({ kind }) => partRow(kind, true))}
          </ul>
        ) : null}
      </section>
    </>
  )
}

/**
 * R: the parts on the board as one list, the parts off it, and Display, in a
 * full page with Done. A part's editor is its own page, opening on a search.
 */
export const CustomiseVariantR = ({ api }: { api: CustomiseController }) => {
  if (api.editing === "rail") return <TrainsEditor api={api} />
  if (api.editing === "bus") return <BusEditor api={api} />
  if (api.editing === "cycle") return <CycleEditor api={api} />
  if (api.editing === "status") return <StatusEditor api={api} />
  if (api.editing) return <PanelBody api={api} kind={api.editing} />
  return (
    <>
      {api.layout.solo ? <SoloLine api={api} /> : null}
      <BoardParts api={api} />
      <section aria-label="Display" className="space-y-1">
        <SectionHeading>Display</SectionHeading>
        <DisplayRows api={api} />
      </section>
    </>
  )
}
