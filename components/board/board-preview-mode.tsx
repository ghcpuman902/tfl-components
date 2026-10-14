"use client"

import { cn } from "@/lib/utils"

type BoardBuilderOverridesProps = {
  /** Override detected interactive → unattended (nobody will touch it). */
  unattended: boolean
  onUnattendedChange: (unattended: boolean) => void
  /** Opt-in room-distance glance view. */
  glance: boolean
  onGlanceChange: (glance: boolean) => void
}

/**
 * The only builder overrides: unattended (touch can't be assumed) and glance
 * (viewing distance can't be detected). Preview frame shape is auto-detected.
 */
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
      className={cn(
        "rounded-full px-3 py-1 text-xs font-medium ring-1 transition-colors",
        unattended
          ? "bg-foreground text-background ring-foreground"
          : "text-muted-foreground ring-border hover:text-foreground hover:ring-foreground/40"
      )}
      onClick={() => onUnattendedChange(!unattended)}
    >
      Nobody will touch it
    </button>
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
      Across the room
    </button>
  </div>
)
