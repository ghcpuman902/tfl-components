"use client"

import type { BoardScreenProfile } from "@/lib/tfl/board-setup-state"
import { cn } from "@/lib/utils"

const MODES = [
  { value: "small" as const, label: "Narrow" },
  { value: "large" as const, label: "Wide" },
] as const

type BoardPreviewModePillsProps = {
  value: BoardScreenProfile
  onChange: (profile: BoardScreenProfile) => void
}

export const BoardPreviewModePills = ({
  value,
  onChange,
}: BoardPreviewModePillsProps) => (
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
)
