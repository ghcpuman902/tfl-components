"use client"

import type { BoardScreenProfile } from "@/lib/tfl/board-setup-state"
import { cn } from "@/lib/utils"

const MODES = [
  { value: "small" as const, label: "Narrow" },
  { value: "large" as const, label: "Wide" },
  { value: "square" as const, label: "Square" },
] as const

type BoardPreviewModePillsProps = {
  value: BoardScreenProfile
  onChange: (profile: BoardScreenProfile) => void
  /** Room-distance glance mode — independent of preview frame shape. */
  glance?: boolean
  onGlanceChange?: (glance: boolean) => void
}

export const BoardPreviewModePills = ({
  value,
  onChange,
  glance = false,
  onGlanceChange,
}: BoardPreviewModePillsProps) => (
  <div className="flex flex-col items-center gap-2">
    <div
      role="group"
      aria-label="Preview format"
      className="flex justify-center gap-1.5"
    >
      {MODES.map((mode) => {
        const selected = value === mode.value
        return (
          <button
            key={mode.value}
            type="button"
            aria-pressed={selected}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium ring-1 transition-colors",
              selected
                ? "bg-foreground text-background ring-foreground"
                : "text-muted-foreground ring-border hover:text-foreground hover:ring-foreground/40"
            )}
            onClick={() => onChange(mode.value)}
          >
            {mode.label}
          </button>
        )
      })}
    </div>
    {onGlanceChange ? (
      <button
        type="button"
        aria-pressed={glance}
        className={cn(
          "rounded-full px-3 py-1 text-xs font-medium ring-1 transition-colors",
          glance
            ? "bg-foreground text-background ring-foreground"
            : "text-muted-foreground ring-border hover:text-foreground hover:ring-foreground/40"
        )}
        onClick={() => onGlanceChange(!glance)}
      >
        Glance
      </button>
    ) : null}
  </div>
)
