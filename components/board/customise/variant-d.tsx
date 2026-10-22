"use client"

import { useState } from "react"
import {
  HeightStepper,
  PanelEye,
  PanelMenu,
  PanelRoundel,
  PanelTargetNote,
  SoloLine,
  panelSummary,
} from "@/components/board/customise/parts"
import {
  KeySettings,
  RailLines,
  ScreenSettings,
  StationPicker,
} from "@/components/board/customise/sections"
import { StatusPriority } from "@/components/board/customise/status-priority"
import type { CustomiseController } from "@/components/board/customise/types"
import { CUSTOMISE_PANEL_LABEL, panelShown } from "@/lib/tfl/board-customise"
import { cn } from "@/lib/utils"

const TABS = [
  { id: "station", label: "Station" },
  { id: "parts", label: "Parts" },
  { id: "order", label: "Order" },
  { id: "more", label: "More" },
] as const

type Tab = (typeof TABS)[number]["id"]

/** D: four task tabs; each tab is one short screen. */
export const CustomiseVariantD = ({ api }: { api: CustomiseController }) => {
  const [tab, setTab] = useState<Tab>("station")
  return (
    <>
      <div
        role="tablist"
        aria-label="Customise"
        className="grid grid-cols-4 border border-input"
      >
        {TABS.map((item) => (
          <button
            key={item.id}
            id={`customise-d-tab-${item.id}`}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            aria-controls={`customise-d-${item.id}`}
            className={cn(
              "min-h-11 border-r border-input px-1 text-sm last:border-r-0",
              tab === item.id
                ? "bg-foreground text-background"
                : "text-foreground"
            )}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <section
        id={`customise-d-${tab}`}
        role="tabpanel"
        aria-labelledby={`customise-d-tab-${tab}`}
        className="space-y-3"
      >
        {tab === "station" ? <StationPicker api={api} /> : null}
        {tab === "parts" ? (
          <>
            <SoloLine api={api} />
            <ul className="border-y border-border">
              {api.layout.panels.map(({ kind }) => (
                <li
                  key={kind}
                  className="border-b border-border last:border-b-0"
                  data-panel={kind}
                >
                  <div className="flex items-center">
                    <span
                      className={cn(
                        "flex min-h-12 min-w-0 flex-1 items-center gap-2",
                        !panelShown(api.layout, kind) && "text-muted-foreground"
                      )}
                    >
                      <PanelRoundel kind={kind} />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">
                          {CUSTOMISE_PANEL_LABEL[kind]}
                          {api.layout.solo === kind ? " · only this" : ""}
                        </span>
                        <span className="block truncate text-sm text-muted-foreground">
                          {panelSummary(api, kind)}
                        </span>
                      </span>
                    </span>
                    <PanelEye api={api} kind={kind} />
                    <PanelMenu api={api} kind={kind} />
                  </div>
                  {panelShown(api.layout, kind) ? (
                    <div className="pb-2 pl-6">
                      <PanelTargetNote api={api} kind={kind} />
                      <HeightStepper api={api} kind={kind} />
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </>
        ) : null}
        {tab === "order" ? (
          <>
            <div className="space-y-2">
              <h3 className="flex items-center gap-1.5 text-sm font-medium">
                <PanelRoundel kind="status" />
                Line status, most important first
              </h3>
              <StatusPriority api={api} />
            </div>
            {api.servingLines.length > 0 ? (
              <div className="space-y-2">
                <h3 className="flex items-center gap-1.5 text-sm font-medium">
                  <PanelRoundel kind="rail" />
                  Trains at {api.stationName}
                </h3>
                <RailLines api={api} />
              </div>
            ) : null}
          </>
        ) : null}
        {tab === "more" ? (
          <>
            <ScreenSettings api={api} />
            <KeySettings />
          </>
        ) : null}
      </section>
    </>
  )
}
