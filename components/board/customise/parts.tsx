"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import {
  EllipsisIcon,
  EyeIcon,
  EyeOffIcon,
  LoaderCircleIcon,
  MinusIcon,
  PlusIcon,
} from "lucide-react"
import { BoardModeRoundel } from "@/components/board/board-mode-roundel"
import type { CustomiseController } from "@/components/board/customise/types"
import {
  CUSTOMISE_PANEL_LABEL,
  canHidePanel,
  canStepHeight,
  heightLabel,
  panelHeight,
  panelShown,
  stepHeight,
} from "@/lib/tfl/board-customise"
import type { BoardPanelKind } from "@/lib/tfl/board-panels"
import { getLineNameTiers } from "@/lib/tfl/line-names"
import type { RoundelPreset } from "@/lib/tfl/roundel-presets"
import { cn } from "@/lib/utils"

/** Square icon button, 44 px target. */
export const ICON_BUTTON =
  "inline-flex size-11 shrink-0 items-center justify-center text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:text-muted-foreground disabled:opacity-60"

export const SQUARE_BUTTON =
  "inline-flex min-h-11 items-center justify-center gap-1.5 border border-input bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:border-foreground aria-pressed:font-medium aria-pressed:shadow-[inset_0_0_0_1px_var(--foreground)] disabled:opacity-50"

export const TEXT_LINK =
  "inline-flex min-h-11 items-center text-sm underline underline-offset-4"

export const SQUARE_CHECK =
  "size-5 shrink-0 appearance-none border border-input bg-background checked:border-foreground checked:bg-foreground checked:shadow-[inset_0_0_0_3px_var(--background)]"

const ROUNDEL: Record<BoardPanelKind, RoundelPreset> = {
  rail: "underground",
  bus: "buses",
  status: "tfl",
  river: "river",
  cycle: "cycles",
}

export const PanelRoundel = ({ kind }: { kind: BoardPanelKind }) => (
  <BoardModeRoundel variant={ROUNDEL[kind]} className="size-4" />
)

export const lineName = (lineId: string) => getLineNameTiers(lineId).full

/** One line, no wrapping: what this panel shows. */
export const panelSummary = (
  api: CustomiseController,
  kind: BoardPanelKind
): string => {
  if (!panelShown(api.layout, kind)) return "Not on the board"
  const target = api.panelTarget(kind)
  if (target === "loading") return "Finding the nearest stop…"
  if (target === "none") {
    return kind === "rail" ? "Pick a station" : `None near ${api.stationName}`
  }
  const height = heightLabel(kind, panelHeight(api.layout, kind))
  if (kind === "rail") {
    const names = (
      api.railLines.length > 0
        ? api.railLines
        : api.servingLines.map((line) => line.lineId)
    ).map(lineName)
    return `${names.join(", ")} · ${height}`
  }
  if (kind === "status") {
    const first = api.statusLines[0]
    return `${first ? `${lineName(first)} first` : "Whole network"} · ${height}`
  }
  return `Nearest to ${api.stationName} · ${height}`
}

/** Eye = on the board or not. While "Only show this" is on, others read as off. */
export const PanelEye = ({
  api,
  kind,
}: {
  api: CustomiseController
  kind: BoardPanelKind
}) => {
  const label = CUSTOMISE_PANEL_LABEL[kind]
  const shown = panelShown(api.layout, kind)
  const locked = shown && !canHidePanel(api.layout, kind)
  return (
    <button
      type="button"
      aria-label={shown ? `Hide ${label}` : `Show ${label}`}
      aria-pressed={shown}
      disabled={locked}
      title={locked ? "A board needs at least one part" : undefined}
      className={cn(ICON_BUTTON, !shown && "text-muted-foreground")}
      onClick={() => api.setPanelOn(kind, !shown)}
    >
      {shown ? (
        <EyeIcon className="size-5" aria-hidden />
      ) : (
        <EyeOffIcon className="size-5" aria-hidden />
      )}
    </button>
  )
}

/** ⋯ on the right: "Only show this" and the column. Closes on outside tap. */
export const PanelMenu = ({
  api,
  kind,
}: {
  api: CustomiseController
  kind: BoardPanelKind
}) => {
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement | null>(null)
  const label = CUSTOMISE_PANEL_LABEL[kind]
  const solo = api.layout.solo === kind
  const column =
    api.layout.panels.find((panel) => panel.kind === kind)?.column ?? "p1"

  useEffect(() => {
    if (!open) return
    const close = (event: PointerEvent) => {
      if (!wrap.current?.contains(event.target as Node)) setOpen(false)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }
    window.addEventListener("pointerdown", close)
    window.addEventListener("keydown", escape)
    return () => {
      window.removeEventListener("pointerdown", close)
      window.removeEventListener("keydown", escape)
    }
  }, [open])

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        aria-label={`${label} options`}
        aria-haspopup="menu"
        aria-expanded={open}
        className={ICON_BUTTON}
        onClick={() => setOpen((value) => !value)}
      >
        <EllipsisIcon className="size-5" aria-hidden />
      </button>
      {open ? (
        <div
          role="menu"
          aria-label={`${label} options`}
          className="absolute top-full right-0 z-30 w-64 border border-foreground/40 bg-background p-2"
        >
          <button
            type="button"
            role="menuitem"
            className="flex min-h-11 w-full items-center px-2 text-left text-sm"
            onClick={() => {
              api.toggleSolo(kind)
              setOpen(false)
            }}
          >
            {solo ? "Show everything again" : "Only show this"}
          </button>
          <p
            id={`customise-column-${kind}`}
            className="px-2 pt-2 pb-1 text-sm text-muted-foreground"
          >
            Column
          </p>
          <div
            role="group"
            aria-labelledby={`customise-column-${kind}`}
            className="grid grid-cols-2"
          >
            {(["p1", "p2"] as const).map((value) => (
              <button
                key={value}
                type="button"
                role="menuitemradio"
                aria-checked={column === value}
                className={cn(
                  SQUARE_BUTTON,
                  "aria-checked:border-foreground aria-checked:font-medium aria-checked:shadow-[inset_0_0_0_1px_var(--foreground)]"
                )}
                onClick={() => api.setPanelColumn(kind, value)}
              >
                {value === "p1" ? "Wide" : "Narrow"}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

/** Height: shortest to Full; + is disabled at the top end. */
export const HeightStepper = ({
  api,
  kind,
}: {
  api: CustomiseController
  kind: BoardPanelKind
}) => {
  const value = panelHeight(api.layout, kind)
  const label = CUSTOMISE_PANEL_LABEL[kind]
  return (
    <div className="flex min-h-11 items-center justify-between gap-3">
      <span className="text-sm">Height</span>
      <div
        role="group"
        aria-label={`${label} height`}
        className="flex items-center border border-input"
      >
        <button
          type="button"
          aria-label={`Shorter ${label}`}
          disabled={!canStepHeight(kind, value, -1)}
          className={ICON_BUTTON}
          onClick={() => api.setPanelHeight(kind, stepHeight(kind, value, -1))}
        >
          <MinusIcon className="size-4" aria-hidden />
        </button>
        <output
          aria-live="polite"
          className="min-w-28 text-center text-sm tabular-nums"
        >
          {heightLabel(kind, value)}
        </output>
        <button
          type="button"
          aria-label={`Taller ${label}`}
          disabled={!canStepHeight(kind, value, 1)}
          className={ICON_BUTTON}
          onClick={() => api.setPanelHeight(kind, stepHeight(kind, value, 1))}
        >
          <PlusIcon className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  )
}

/** "Only Line status shown · Show all", else how many parts are on. */
export const SoloLine = ({
  api,
  title = true,
}: {
  api: CustomiseController
  title?: boolean
}) => {
  const solo = api.layout.solo
  const on = api.layout.panels.filter((panel) => panel.on).length
  return (
    <p
      role="status"
      className="flex min-h-11 items-center justify-between gap-3 text-sm"
    >
      {solo ? (
        <>
          <span>Only {CUSTOMISE_PANEL_LABEL[solo]} shown</span>
          <button
            type="button"
            className={TEXT_LINK}
            onClick={() => api.toggleSolo(solo)}
          >
            Show all
          </button>
        </>
      ) : (
        <>
          <span className="font-medium">{title ? "Board" : null}</span>
          <span className="text-muted-foreground">
            {on} of {api.layout.panels.length} parts on
          </span>
        </>
      )}
    </p>
  )
}

/** Async state of a panel's nearby stop. */
export const PanelTargetNote = ({
  api,
  kind,
}: {
  api: CustomiseController
  kind: BoardPanelKind
}) => {
  const target = api.panelTarget(kind)
  if (kind === "status" || (kind === "rail" && target === "ready")) return null
  return (
    <p
      role="status"
      className="flex min-h-11 items-center gap-2 text-sm text-muted-foreground"
    >
      {target === "ready" ? (
        `Uses the nearest stop to ${api.stationName}.`
      ) : target === "loading" ? (
        <>
          <LoaderCircleIcon
            className="size-4 animate-spin motion-reduce:animate-none"
            aria-hidden
          />
          Finding the nearest stop to {api.stationName}…
        </>
      ) : kind === "rail" ? (
        "Pick a station to show its trains."
      ) : (
        `Nothing near ${api.stationName}, so this part stays off the board.`
      )}
    </p>
  )
}

export const SectionHeading = ({
  id,
  children,
}: {
  id?: string
  children: ReactNode
}) => (
  <h3 id={id} className="pt-2 text-sm font-medium text-muted-foreground">
    {children}
  </h3>
)
