"use client"

import { useState } from "react"
import { PlusIcon } from "lucide-react"
import {
  PanelEye,
  PanelMenu,
  PanelRoundel,
  SQUARE_BUTTON,
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
import { useBusLayout } from "@/components/board/use-bus-layout"
import { ARRIVALS_RHYTHM_VARS } from "@/components/tfl/arrivals/arrivals-board-view"
import {
  CUSTOMISE_PANEL_LABEL,
  layoutSections,
  panelHeight,
  panelRowTiles,
  panelShown,
} from "@/lib/tfl/board-customise"
import type { BoardPanelKind } from "@/lib/tfl/board-panels"
import type { BoardPanelColumn } from "@/lib/tfl/board-setup-state"
import { cn } from "@/lib/utils"
import { LINE_ORDER } from "tfl-ts"

/** C: the board's own layout is the menu. Tap a layer to edit it below. */
export const CustomiseVariantC = ({ api }: { api: CustomiseController }) => {
  const [selected, setSelected] = useState<BoardPanelKind | null>(null)
  const sections = layoutSections(api.layout)
  const busLayout = useBusLayout()

  const tile = (kind: BoardPanelKind, column: BoardPanelColumn) => {
    const shown = panelShown(api.layout, kind)
    const tiles = panelRowTiles(kind, panelHeight(api.layout, kind), {
      column,
      lines:
        kind === "rail"
          ? api.railLines.length || api.servingLines.length
          : api.statusOnlyThese
            ? api.statusLines.length
            : LINE_ORDER.length,
      unattended: api.unattended,
      busLayout,
    })
    return (
      <button
        key={kind}
        type="button"
        aria-pressed={selected === kind}
        aria-label={`Edit ${CUSTOMISE_PANEL_LABEL[kind]}`}
        className={cn(
          "flex w-full items-start gap-1.5 border border-input p-2 text-left text-sm",
          selected === kind &&
            "border-foreground shadow-[inset_0_0_0_1px_var(--foreground)]",
          !shown && "border-dashed text-muted-foreground"
        )}
        // A quarter-scale board, never under a 44px target.
        style={{
          height: `max(2.75rem, calc(var(--arrivals-row) * ${tiles} / 4))`,
        }}
        onClick={() => setSelected(selected === kind ? null : kind)}
      >
        <PanelRoundel kind={kind} />
        <span>{CUSTOMISE_PANEL_LABEL[kind]}</span>
      </button>
    )
  }

  return (
    <>
      <section aria-labelledby="customise-c-station" className="space-y-1">
        <SectionHeading id="customise-c-station">Station</SectionHeading>
        <StationPicker api={api} />
      </section>
      <section aria-labelledby="customise-c-board" className="space-y-2">
        <SectionHeading id="customise-c-board">
          Your board · tap a part to change it
        </SectionHeading>
        <SoloLine api={api} title={false} />
        <div
          className="grid grid-cols-3 gap-1.5"
          style={ARRIVALS_RHYTHM_VARS}
        >
          <div
            className="col-span-2 space-y-1.5"
            aria-label="Wide column"
            role="group"
          >
            {sections.wide.map((panel) => tile(panel.kind, "p1"))}
          </div>
          <div className="space-y-1.5" aria-label="Narrow column" role="group">
            {sections.narrow.map((panel) => tile(panel.kind, "p2"))}
          </div>
        </div>
        {sections.off.length > 0 ? (
          <div
            className="flex flex-wrap gap-1.5"
            role="group"
            aria-label="Not on the board"
          >
            {sections.off.map((panel) => (
              <button
                key={panel.kind}
                type="button"
                className={SQUARE_BUTTON}
                onClick={() => {
                  api.setPanelOn(panel.kind, true)
                  setSelected(panel.kind)
                }}
              >
                <PlusIcon className="size-4" aria-hidden />
                {CUSTOMISE_PANEL_LABEL[panel.kind]}
              </button>
            ))}
          </div>
        ) : null}
      </section>
      {selected ? (
        <section
          aria-labelledby="customise-c-editor"
          className="space-y-2 border-l-2 border-foreground pl-3"
        >
          <div className="flex items-center gap-1">
            <h3
              id="customise-c-editor"
              className="flex min-w-0 flex-1 items-center gap-1.5 text-base font-medium"
            >
              <PanelRoundel kind={selected} />
              <span className="min-w-0">
                <span className="block">{CUSTOMISE_PANEL_LABEL[selected]}</span>
                <span className="block truncate text-sm font-normal text-muted-foreground">
                  {panelSummary(api, selected)}
                </span>
              </span>
            </h3>
            <PanelEye api={api} kind={selected} />
            <PanelMenu api={api} kind={selected} />
          </div>
          <PanelBody api={api} kind={selected} />
        </section>
      ) : null}
      <section aria-label="Display" className="space-y-1">
        <SectionHeading>Display</SectionHeading>
        <DisplayRows api={api} />
      </section>
    </>
  )
}
