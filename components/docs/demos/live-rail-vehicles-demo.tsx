"use client"

import { useState } from "react"
import { BoardLineChipPicker } from "@/components/board/board-line-chip-picker"
import { LiveRailVehicles } from "@/components/tfl/live-vehicles/live-rail-vehicles"
import { useUserTflCredentials } from "@/components/user-tfl-credentials-provider"
import { TEXT_LINK_CLASS } from "@/lib/text-link"
import {
  DEFAULT_LIVE_RAIL_LINE_IDS,
  LIVE_RAIL_LINE_IDS,
  SITE_MAX_LIVE_RAIL_LINES,
} from "@/lib/tfl/live-rail-line-ids"
import type { TargetRequestsPerMinute } from "@/lib/tfl/vehicle-poll-rate"

const RAIL_LINES = LIVE_RAIL_LINE_IDS.map((lineId) => ({ lineId }))

export default function LiveRailVehiclesDemo() {
  const { status, openDialog } = useUserTflCredentials()
  const hasKey = status === "ready"
  const [railLineIds, setRailLineIds] = useState<readonly string[]>([
    ...DEFAULT_LIVE_RAIL_LINE_IDS,
  ])
  const [rate, setRate] = useState<TargetRequestsPerMinute>("max")
  const [capMessage, setCapMessage] = useState<string | null>(null)

  // Without the user's own key, the shared key caps how many lines we follow.
  const visibleLineIds =
    !hasKey && railLineIds.length > SITE_MAX_LIVE_RAIL_LINES
      ? railLineIds.slice(0, SITE_MAX_LIVE_RAIL_LINES)
      : railLineIds

  const handleLinesChange = (next: readonly string[] | undefined) => {
    const resolved = next?.length ? [...next] : [...LIVE_RAIL_LINE_IDS]
    if (!hasKey && resolved.length > SITE_MAX_LIVE_RAIL_LINES) {
      setCapMessage(
        `The shared key follows up to ${SITE_MAX_LIVE_RAIL_LINES} lines at once. Add your own TfL API key to follow more.`
      )
      openDialog()
      return
    }
    setCapMessage(null)
    setRailLineIds(resolved)
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        TfL arrivals update about every 30 seconds and are often around 45
        seconds old. This demo polls at that low rate and interpolates train
        positions between updates.
      </p>
      <BoardLineChipPicker
        lines={RAIL_LINES}
        selected={visibleLineIds}
        onChange={handleLinesChange}
      />
      {capMessage ? (
        <p className="text-sm text-muted-foreground">
          {capMessage}{" "}
          <button
            type="button"
            className={TEXT_LINK_CLASS}
            onClick={() => openDialog()}
          >
            Add a key
          </button>
        </p>
      ) : !hasKey ? (
        <p className="text-sm text-muted-foreground">
          Shared key: pick up to {SITE_MAX_LIVE_RAIL_LINES} lines.{" "}
          <button
            type="button"
            className={TEXT_LINK_CLASS}
            onClick={() => openDialog()}
          >
            Add your own key
          </button>{" "}
          to follow more at once.
        </p>
      ) : null}
      <LiveRailVehicles
        railLineIds={visibleLineIds}
        targetRequestsPerMinute={hasKey ? rate : "max"}
      />
      <details className="text-xs text-muted-foreground">
        <summary className="w-fit cursor-pointer py-2">Refresh rate</summary>
        {hasKey ? (
          <select
            aria-label="Refresh rate"
            value={rate}
            onChange={(event) =>
              setRate(
                event.target.value === "max"
                  ? "max"
                  : (Number(event.target.value) as TargetRequestsPerMinute)
              )
            }
            className="min-h-11 rounded-md border bg-background px-3 text-foreground"
          >
            <option value="max">Maximum</option>
            <option value="15">15/min</option>
            <option value="6">6/min</option>
            <option value="3">3/min</option>
          </select>
        ) : (
          <p className="pb-2">
            Add a TfL API key in the sidebar to choose a faster refresh rate.
          </p>
        )}
      </details>
    </div>
  )
}
