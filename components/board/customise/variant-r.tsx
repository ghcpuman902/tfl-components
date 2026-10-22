"use client"

import { useState } from "react"
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

/** One layer: roundel · name and summary · eye · ⋯. Tap the name to open it. */
const LayerRow = ({
  api,
  kind,
}: {
  api: CustomiseController
  kind: BoardPanelKind
}) => {
  const [open, setOpen] = useState(false)
  const label = CUSTOMISE_PANEL_LABEL[kind]
  const shown = panelShown(api.layout, kind)
  const bodyId = `customise-r-${kind}`
  return (
    <li className="border-b border-border last:border-b-0" data-panel={kind}>
      <div className="flex items-center">
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
        <div id={bodyId} className="pb-4 pl-6">
          <PanelBody api={api} kind={kind} />
        </div>
      ) : null}
    </li>
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
          <ul className="border-y border-border">
            {group.panels.map((panel) => (
              <LayerRow key={panel.kind} api={api} kind={panel.kind} />
            ))}
          </ul>
        </section>
      ))}
      <section aria-label="Display" className="space-y-1">
        <SectionHeading>Display</SectionHeading>
        <DisplayRows api={api} />
      </section>
    </>
  )
}
