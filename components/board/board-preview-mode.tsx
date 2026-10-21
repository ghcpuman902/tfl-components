"use client"

import type { BoardScreenProfile } from "@/lib/tfl/board-setup-state"
import { cn } from "@/lib/utils"

const PREVIEW_MODES = [
  { value: "small" as const, label: "Narrow" },
  { value: "large" as const, label: "Wide" },
  { value: "square" as const, label: "Square" },
] as const

const pillClass = (selected: boolean) =>
  cn(
    "rounded-full px-3 py-1 text-xs font-medium ring-1 transition-colors",
    selected
      ? "bg-foreground text-background ring-foreground"
      : "text-muted-foreground ring-border hover:text-foreground hover:ring-foreground/40"
  )

type BoardPreviewModePillsProps = {
  value: BoardScreenProfile | null
  onChange: (profile: BoardScreenProfile) => void
}

/** Preview any frame while setting up; only the set-up board follows the real screen. */
export const BoardPreviewModePills = ({
  value,
  onChange,
}: BoardPreviewModePillsProps) => (
  <div
    role="group"
    aria-label="Preview format"
    className="flex justify-center gap-1.5"
  >
    {PREVIEW_MODES.map((mode) => (
      <button
        key={mode.value}
        type="button"
        aria-pressed={value === mode.value}
        className={pillClass(value === mode.value)}
        onClick={() => onChange(mode.value)}
      >
        {mode.label}
      </button>
    ))}
  </div>
)

type BoardBuilderOverridesProps = {
  /** Override detected interactive → unattended (nobody will touch it). */
  unattended: boolean
  onUnattendedChange: (unattended: boolean) => void
  /** Opt-in room-distance glance view. */
  glance: boolean
  onGlanceChange: (glance: boolean) => void
}

/** Touch and viewing distance can't be detected, so the builder asks. */
export const BoardBuilderOverrides = ({
  unattended,
  onUnattendedChange,
  glance,
  onGlanceChange,
}: BoardBuilderOverridesProps) => (
  <div
    role="group"
    aria-label="Board overrides"
    className="flex flex-wrap justify-center gap-1.5"
  >
    <button
      type="button"
      aria-pressed={unattended}
      className={pillClass(unattended)}
      onClick={() => onUnattendedChange(!unattended)}
    >
      Nobody will touch it
    </button>
    <button
      type="button"
      aria-pressed={glance}
      className={pillClass(glance)}
      onClick={() => onGlanceChange(!glance)}
    >
      Across the room
    </button>
  </div>
)
