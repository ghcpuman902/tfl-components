"use client"

import { useState } from "react"
import { BoardServingLineEditor } from "@/components/board/board-status-line-editor"
import { BoardStationSearch } from "@/components/board/board-station-search"
import {
  HeightStepper,
  PanelTargetNote,
  SQUARE_BUTTON,
  SQUARE_CHECK,
} from "@/components/board/customise/parts"
import { StatusPriority } from "@/components/board/customise/status-priority"
import type { CustomiseController } from "@/components/board/customise/types"
import { TflApiKeyField } from "@/components/tfl-api-key-field"
import { panelShown } from "@/lib/tfl/board-customise"
import type { BoardPanelKind } from "@/lib/tfl/board-panels"

/** Station name, and the search (always open, or behind Change). */
export const StationPicker = ({
  api,
  collapsible = false,
}: {
  api: CustomiseController
  collapsible?: boolean
}) => {
  const [changing, setChanging] = useState(!collapsible)
  return (
    <div className="space-y-2">
      <div className="flex min-h-11 items-center justify-between gap-3">
        <p className="min-w-0 text-sm">
          <span className="font-medium">{api.stationName}</span>
          {api.stationContext ? (
            <span className="text-muted-foreground">{api.stationContext}</span>
          ) : null}
        </p>
        {collapsible ? (
          <button
            type="button"
            aria-expanded={changing}
            className={SQUARE_BUTTON}
            onClick={() => setChanging((value) => !value)}
          >
            {changing ? "Close" : "Change"}
          </button>
        ) : null}
      </div>
      {changing ? (
        <BoardStationSearch
          stations={api.stations}
          stopId={api.stopId ?? undefined}
          onStopChange={(stop) => {
            api.pickStation(stop)
            if (collapsible && stop) setChanging(false)
          }}
        />
      ) : null}
    </div>
  )
}

/** Rail lines at the station, in board order (the builder's own chip editor). */
export const RailLines = ({ api }: { api: CustomiseController }) => (
  <BoardServingLineEditor
    servingLines={api.servingLines}
    lineGroups={api.lineGroups}
    selected={api.railLines}
    onChange={api.setRailLines}
  />
)

/** What opens under a panel: its height, its nearby stop, its own settings. */
export const PanelBody = ({
  api,
  kind,
}: {
  api: CustomiseController
  kind: BoardPanelKind
}) => (
  <div className="space-y-3">
    <PanelTargetNote api={api} kind={kind} />
    {panelShown(api.layout, kind) ? (
      <HeightStepper api={api} kind={kind} />
    ) : null}
    {kind === "rail" && api.servingLines.length > 0 ? (
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">
          Drag to change the order.
        </p>
        <RailLines api={api} />
      </div>
    ) : null}
    {kind === "status" ? <StatusPriority api={api} /> : null}
  </div>
)

/** Who looks at the screen; each switch means one thing. */
export const ScreenSettings = ({ api }: { api: CustomiseController }) => (
  <fieldset className="space-y-1">
    <legend className="sr-only">Screen</legend>
    <label className="flex min-h-11 items-center gap-2 text-sm">
      <input
        type="checkbox"
        className={SQUARE_CHECK}
        checked={api.unattended}
        onChange={(event) => api.setUnattended(event.target.checked)}
      />
      Nobody touches the screen
    </label>
    <label className="flex min-h-11 items-center gap-2 text-sm">
      <input
        type="checkbox"
        className={SQUARE_CHECK}
        checked={api.glance}
        onChange={(event) => api.setGlance(event.target.checked)}
      />
      Read from across the room
    </label>
  </fieldset>
)

export const KeySettings = () => (
  <section aria-labelledby="board-key-heading" className="space-y-2">
    <h3 id="board-key-heading" className="text-sm font-medium">
      Your own TfL key
    </h3>
    <p className="text-sm text-muted-foreground">
      Optional. Boards on this browser use it instead of the shared key. It
      stays here and is not in the link.
    </p>
    <TflApiKeyField id="board-tfl-key" labelledBy="board-key-heading" />
  </section>
)

/** Screen and key, collapsed with one-line summaries (Q6). */
export const DisplayRows = ({ api }: { api: CustomiseController }) => {
  const [open, setOpen] = useState<"screen" | "key" | null>(null)
  const rows = [
    {
      id: "screen" as const,
      label: "Screen",
      value: `${api.unattended ? "Nobody touches it" : "People touch it"}${
        api.glance ? " · across the room" : ""
      }`,
    },
    { id: "key" as const, label: "Your own TfL key", value: "Optional" },
  ]
  return (
    <ul className="border-y border-border">
      {rows.map((row) => (
        <li key={row.id} className="border-b border-border last:border-b-0">
          <button
            type="button"
            aria-expanded={open === row.id}
            className="flex min-h-12 w-full flex-col justify-center py-1 text-left"
            onClick={() => setOpen(open === row.id ? null : row.id)}
          >
            <span className="text-sm font-medium">{row.label}</span>
            <span className="truncate text-sm text-muted-foreground">
              {row.value}
            </span>
          </button>
          {open === row.id ? (
            <div className="pb-4">
              {row.id === "screen" ? (
                <ScreenSettings api={api} />
              ) : (
                <KeySettings />
              )}
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  )
}
