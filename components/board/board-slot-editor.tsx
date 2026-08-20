"use client"

import {
  BOARD_PANEL_KINDS,
  resolveBoardSlots,
  type BoardPanelKind,
} from "@/lib/tfl/board-panels"
import type { BoardSlotsConfig } from "@/lib/tfl/board-url-state"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const PANEL_LABEL: Record<BoardPanelKind, string> = {
  rail: "Rail",
  bus: "Bus",
  river: "River",
  cycle: "Cycle",
  status: "Status",
}

type BoardSlotEditorProps = {
  slots: BoardSlotsConfig
  onChange: (slots: BoardSlotsConfig) => void
}

const addKind = (
  stack: readonly BoardPanelKind[],
  kind: BoardPanelKind
): BoardPanelKind[] => (stack.includes(kind) ? [...stack] : [...stack, kind])

const removeKind = (
  stack: readonly BoardPanelKind[],
  kind: BoardPanelKind
): BoardPanelKind[] => stack.filter((item) => item !== kind)

export const BoardSlotEditor = ({ slots, onChange }: BoardSlotEditorProps) => {
  const resolved = resolveBoardSlots(slots.p1, slots.p2)
  const used = new Set([...resolved.p1, ...resolved.p2])
  const unused = BOARD_PANEL_KINDS.filter((kind) => !used.has(kind))

  const commit = (
    p1: readonly BoardPanelKind[],
    p2: readonly BoardPanelKind[]
  ) => {
    onChange({ p1: [...p1], p2: [...p2] })
  }

  const renderStack = (
    label: string,
    which: "p1" | "p2",
    stack: readonly BoardPanelKind[]
  ) => (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <div className="flex flex-wrap gap-2">
        {stack.length === 0 ? (
          <span className="text-sm text-muted-foreground">Empty</span>
        ) : (
          stack.map((kind) => (
            <Button
              key={kind}
              type="button"
              size="sm"
              variant="outline"
              aria-label={`Remove ${PANEL_LABEL[kind]} from ${label}`}
              onClick={() =>
                commit(
                  which === "p1" ? removeKind(stack, kind) : resolved.p1,
                  which === "p2" ? removeKind(stack, kind) : resolved.p2
                )
              }
            >
              {PANEL_LABEL[kind]} ×
            </Button>
          ))
        )}
      </div>
      {unused.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Add</span>
          {unused.map((kind) => (
            <Button
              key={kind}
              type="button"
              size="sm"
              variant="ghost"
              className={cn("h-7 px-2")}
              onClick={() =>
                commit(
                  which === "p1" ? addKind(stack, kind) : resolved.p1,
                  which === "p2" ? addKind(stack, kind) : resolved.p2
                )
              }
            >
              {PANEL_LABEL[kind]}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  )

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {renderStack("Wide slot", "p1", resolved.p1)}
      {renderStack("Narrow slot", "p2", resolved.p2)}
    </div>
  )
}
