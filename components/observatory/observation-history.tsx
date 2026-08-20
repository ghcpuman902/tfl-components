"use client"

import { useState } from "react"
import {
  CircleCheck,
  CircleDashed,
  CloudOff,
  GitCompare,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react"
import { ObservationTime } from "@/components/observatory/observation-time"
import { CHIP_CAP_TEXT_BOX_CLASS } from "@/components/tfl/arrivals/chip-text"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { formatCountDelta } from "@/lib/tfl/observatory/census"
import {
  groupHistoryRuns,
  type HistoryRun,
} from "@/lib/tfl/observatory/history"
import { observatoryStateLabel } from "@/lib/tfl/observatory/format"
import type {
  ObservatoryHistoryEvent,
  ObservatoryState,
} from "@/lib/tfl/observatory/types"
import { cn } from "@/lib/utils"

type DisplayState = ObservatoryState | "observed"

const STATE_ICON: Record<DisplayState, LucideIcon> = {
  current: CircleCheck,
  suspect: TriangleAlert,
  changed: GitCompare,
  incomplete: CircleDashed,
  unavailable: CloudOff,
  observed: CircleCheck,
}

const STATE_ICON_CLASS: Record<DisplayState, string> = {
  current: "text-emerald-600 dark:text-emerald-400",
  suspect: "text-amber-600 dark:text-amber-400",
  changed: "text-sky-600 dark:text-sky-400",
  incomplete: "text-rose-600 dark:text-rose-400",
  unavailable: "text-rose-600 dark:text-rose-400",
  observed: "text-emerald-600 dark:text-emerald-400",
}

const STATE_BADGE_CLASS: Record<DisplayState, string> = {
  current: "bg-emerald-500/10",
  suspect: "bg-amber-500/10",
  changed: "bg-sky-500/10",
  incomplete: "bg-rose-500/10",
  unavailable: "bg-rose-500/10",
  observed: "bg-emerald-500/10",
}

const formatCount = (value: number): string =>
  new Intl.NumberFormat("en-GB").format(value)

const StateIcon = ({ state }: { state: DisplayState }) => {
  const Icon = STATE_ICON[state]
  return (
    <span
      className={cn(
        "inline-flex size-5 items-center justify-center rounded-full",
        STATE_BADGE_CLASS[state]
      )}
    >
      <Icon className={cn("size-3", STATE_ICON_CLASS[state])} aria-hidden />
    </span>
  )
}

const AllNormalPill = () => (
  <Badge
    variant="outline"
    className={cn(
      "overflow-visible px-1 text-muted-foreground",
      STATE_BADGE_CLASS.observed
    )}
  >
    <CircleCheck
      data-icon="inline-start"
      className={cn("-ml-0.5 size-3 shrink-0", STATE_ICON_CLASS.observed)}
      aria-hidden
    />
    <span className={CHIP_CAP_TEXT_BOX_CLASS}>All normal</span>
  </Badge>
)

const RunStatus = ({ run }: { run: HistoryRun }) => {
  const allNormal = run.abnormal.length === 0
  const showOthers =
    run.abnormal.length > 0 && run.abnormal.length < run.rows.length
  const label = allNormal
    ? "All normal"
    : run.abnormal
        .map((row) => `${row.title} ${observatoryStateLabel(row.state)}`)
        .join(", ") + (showOthers ? ". Other normal" : "")

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-1.5" aria-label={label}>
          {allNormal ? (
            <AllNormalPill />
          ) : (
            <>
              {run.abnormal.map((row) => (
                <StateIcon key={row.id} state={row.state as DisplayState} />
              ))}
              {showOthers ? (
                <span className="text-muted-foreground">other normal</span>
              ) : null}
            </>
          )}
        </span>
      </TooltipTrigger>
      <TooltipContent
        side="left"
        className="max-w-64 flex-col items-stretch gap-1 py-2"
      >
        {run.rows.map((row) => (
          <p key={row.id} className="flex justify-between gap-4">
            <span>{row.title}</span>
            <span>{observatoryStateLabel(row.state)}</span>
          </p>
        ))}
      </TooltipContent>
    </Tooltip>
  )
}

const RunDetails = ({ run }: { run: HistoryRun }) => (
  <ul className="mt-3 space-y-2 border-t border-border pt-3">
    {run.rows.map((row) => {
      const delta =
        row.observedCount != null && row.baselineCount != null
          ? row.observedCount - row.baselineCount
          : null
      return (
        <li
          key={row.id}
          className="grid gap-x-3 gap-y-0.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-baseline"
        >
          <p className="text-foreground">{row.title}</p>
          <p className="inline-flex items-center justify-end gap-1.5">
            {isAbnormal(row.state) ? (
              <StateIcon state={row.state as DisplayState} />
            ) : null}
            <span>{observatoryStateLabel(row.state)}</span>
          </p>
          {row.observedCount != null ? (
            <p className="tabular-nums sm:col-span-2">
              {formatCount(row.observedCount)}
              {row.baselineCount != null
                ? ` · ${formatCount(row.baselineCount)} previous`
                : ""}
              {delta != null && delta !== 0
                ? ` · ${formatCountDelta(delta)}`
                : ""}
            </p>
          ) : null}
          {row.summary && isAbnormal(row.state) ? (
            <p className="sm:col-span-2">{row.summary}</p>
          ) : null}
        </li>
      )
    })}
  </ul>
)

const isAbnormal = (state: string): boolean =>
  state === "unavailable" ||
  state === "incomplete" ||
  state === "suspect" ||
  state === "changed"

const HistoryRunRow = ({ run }: { run: HistoryRun }) => {
  const [open, setOpen] = useState(false)

  const handleToggle = () => {
    setOpen((current) => !current)
  }

  return (
    <li className="border-b border-border py-2.5 last:border-b-0">
      <button
        type="button"
        aria-expanded={open}
        onClick={handleToggle}
        className="grid w-full gap-x-4 gap-y-1 text-left sm:grid-cols-[9.5rem_minmax(0,1fr)_auto] sm:items-baseline"
      >
        <p className="text-foreground tabular-nums">
          <ObservationTime iso={run.at} fallback={run.at} />
        </p>
        <p className="min-w-0 text-foreground">{run.summary}</p>
        <RunStatus run={run} />
      </button>
      {open ? <RunDetails run={run} /> : null}
    </li>
  )
}

export const ObservationHistory = ({
  events,
}: {
  events: readonly ObservatoryHistoryEvent[]
}) => {
  const runs = groupHistoryRuns(events).slice(0, 24)

  if (runs.length === 0) {
    return <p>No observation history yet.</p>
  }

  return (
    <ol>
      {runs.map((run) => (
        <HistoryRunRow key={run.at} run={run} />
      ))}
    </ol>
  )
}
