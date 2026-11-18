"use client"

import {
  useState,
  type CSSProperties,
  type DOMAttributes,
  type ReactNode,
  type Ref,
} from "react"
import { PlusIcon } from "lucide-react"
import {
  DragGrip,
  GRIP_SLOT,
  PRESS_SURFACE,
  useDragOrder,
} from "@/components/board/customise/drag-order"
import {
  ICON_BUTTON,
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
 * open it; on touch, hold the row to drag it. A part that is off has no
 * stack place, so no grip, and only + to put it on the board.
 */
const LayerRow = ({
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
  const [open, setOpen] = useState(false)
  const label = CUSTOMISE_PANEL_LABEL[kind]
  const shown = panelShown(api.layout, kind)
  const bodyId = `customise-r-${kind}`
  const summary = panelSummary(api, kind, { hiddenRow: off })
  return (
    <li
      ref={rowRef}
      className={cn(
        "border-b border-border last:border-b-0",
        motion?.className
      )}
      style={motion?.style}
      data-panel={kind}
    >
      <div className={cn("flex items-center", PRESS_SURFACE)} {...press}>
        {grip ?? <span aria-hidden className={GRIP_SLOT} />}
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
            {summary ? (
              <span className="block truncate text-sm text-muted-foreground">
                {summary}
              </span>
            ) : null}
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
            <PanelEye api={api} kind={kind} />
            <PanelMenu api={api} kind={kind} />
          </>
        )}
      </div>
      {open ? (
        <div id={bodyId} className="pb-4 pl-15 pointer-coarse:pl-9">
          <PanelBody api={api} kind={kind} />
        </div>
      ) : null}
    </li>
  )
}

const LayerList = ({
  api,
  panels,
}: {
  api: CustomiseController
  panels: readonly { kind: BoardPanelKind }[]
}) => {
  const { listRef, row, press, grip, rowMotion } =
    useDragOrder<HTMLUListElement>({
      ids: panels.map((panel) => panel.kind),
      onPlace: (kind, index) => api.placePanel(kind as BoardPanelKind, index),
    })
  return (
    <ul ref={listRef} className="relative border-y border-border">
      {panels.map(({ kind }) => (
        <LayerRow
          key={kind}
          api={api}
          kind={kind}
          rowRef={row(kind)}
          press={press(kind)}
          grip={<DragGrip name={CUSTOMISE_PANEL_LABEL[kind]} {...grip(kind)} />}
          motion={rowMotion(kind)}
        />
      ))}
    </ul>
  )
}

/** R: the board as a layer list, split by column, in a full page with Done. */
export const CustomiseVariantR = ({ api }: { api: CustomiseController }) => {
  const sections = layoutSections(api.layout)
  const groups = [
    { id: "wide", title: "Wide column", panels: sections.wide },
    { id: "narrow", title: "Narrow column", panels: sections.narrow },
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
          <LayerList api={api} panels={group.panels} />
        </section>
      ))}
      {sections.off.length > 0 ? (
        // No heading: a blank band sets these apart, and + says what they are.
        <div className="pt-5">
          <ul aria-label="Not on the board" className="border-y border-border">
            {sections.off.map(({ kind }) => (
              <LayerRow key={kind} api={api} kind={kind} off />
            ))}
          </ul>
        </div>
      ) : null}
      <section aria-label="Display" className="space-y-1">
        <SectionHeading>Display</SectionHeading>
        <DisplayRows api={api} />
      </section>
    </>
  )
}
