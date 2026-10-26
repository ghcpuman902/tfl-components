"use client"

import { useState, type ReactNode, type Ref } from "react"
import {
  DragGrip,
  DropMarker,
  useDragOrder,
} from "@/components/board/customise/drag-order"
import {
  PanelEye,
  PanelMenu,
  PanelRoundel,
  SectionHeading,
  SoloLine,
  panelSummary,
} from "@/components/board/customise/parts"
import {
  DisplayRows,
  PanelBody,
  StationPicker,
} from "@/components/board/customise/sections"
import type { CustomiseController } from "@/components/board/customise/types"
import {
  CUSTOMISE_PANEL_LABEL,
  layoutSections,
  panelShown,
} from "@/lib/tfl/board-customise"
import type { BoardPanelKind } from "@/lib/tfl/board-panels"
import { cn } from "@/lib/utils"

/**
 * One layer: grip · roundel · name and summary · eye · ⋯. Tap the name to
 * open it. Parts that are off have no stack place, so no grip.
 */
const LayerRow = ({
  api,
  kind,
  rowRef,
  grip,
  dragging = false,
}: {
  api: CustomiseController
  kind: BoardPanelKind
  rowRef?: Ref<HTMLLIElement>
  grip?: ReactNode
  dragging?: boolean
}) => {
  const [open, setOpen] = useState(false)
  const label = CUSTOMISE_PANEL_LABEL[kind]
  const shown = panelShown(api.layout, kind)
  const bodyId = `customise-r-${kind}`
  return (
    <li
      ref={rowRef}
      className={cn(
        "border-b border-border last:border-b-0",
        dragging && "opacity-40"
      )}
      data-panel={kind}
    >
      <div className="flex items-center">
        {grip ?? <span aria-hidden className="w-11 shrink-0" />}
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          className={cn(
            "flex min-h-12 min-w-0 flex-1 items-center gap-2 py-1 text-left",
            !shown && "text-muted-foreground"
          )}
          onClick={() => setOpen((value) => !value)}
        >
          <PanelRoundel kind={kind} />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">
              {label}
              {api.layout.solo === kind ? " · only this" : ""}
            </span>
            <span className="block truncate text-sm text-muted-foreground">
              {panelSummary(api, kind)}
            </span>
          </span>
        </button>
        <PanelEye api={api} kind={kind} />
        <PanelMenu api={api} kind={kind} />
      </div>
      {open ? (
        <div id={bodyId} className="pb-4 pl-17">
          <PanelBody api={api} kind={kind} />
        </div>
      ) : null}
    </li>
  )
}

const LayerList = ({
  api,
  panels,
  orderable,
}: {
  api: CustomiseController
  panels: readonly { kind: BoardPanelKind }[]
  orderable: boolean
}) => {
  const { listRef, row, grip, dragging, marker } =
    useDragOrder<HTMLUListElement>({
      ids: panels.map((panel) => panel.kind),
      onPlace: (kind, index) => api.placePanel(kind as BoardPanelKind, index),
    })
  return (
    <ul ref={listRef} className="relative border-y border-border">
      {panels.map(({ kind }) =>
        orderable ? (
          <LayerRow
            key={kind}
            api={api}
            kind={kind}
            rowRef={row(kind)}
            grip={
              <DragGrip name={CUSTOMISE_PANEL_LABEL[kind]} {...grip(kind)} />
            }
            dragging={dragging === kind}
          />
        ) : (
          <LayerRow key={kind} api={api} kind={kind} />
        )
      )}
      {marker ? <DropMarker top={marker.top} /> : null}
    </ul>
  )
}

/** R: the board as a layer list, split by column, in a full page with Done. */
export const CustomiseVariantR = ({ api }: { api: CustomiseController }) => {
  const sections = layoutSections(api.layout)
  const groups = [
    { id: "wide", title: "Wide column", panels: sections.wide },
    { id: "narrow", title: "Narrow column", panels: sections.narrow },
    { id: "off", title: "Not on the board", panels: sections.off },
  ].filter((group) => group.panels.length > 0)
  return (
    <>
      <SoloLine api={api} />
      <section aria-labelledby="customise-r-station" className="space-y-1">
        <SectionHeading id="customise-r-station">Station</SectionHeading>
        <StationPicker api={api} collapsible />
      </section>
      {groups.map((group) => (
        <section
          key={group.id}
          aria-labelledby={`customise-r-${group.id}`}
          className="space-y-1"
        >
          <SectionHeading id={`customise-r-${group.id}`}>
            {group.title}
          </SectionHeading>
          <LayerList
            api={api}
            panels={group.panels}
            orderable={group.id !== "off"}
          />
        </section>
      ))}
      <section aria-label="Display" className="space-y-1">
        <SectionHeading>Display</SectionHeading>
        <DisplayRows api={api} />
      </section>
    </>
  )
}
