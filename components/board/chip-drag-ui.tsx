import { CirclePlus, Trash2Icon, XIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/** Always on for touch; hover/focus on fine pointers. */
const CHIP_ACTION_BADGE_CLASS =
  "pointer-events-none absolute -top-1.5 -right-1.5 text-muted-foreground opacity-100 transition-opacity [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-visible:opacity-100 group-focus-visible:opacity-100"

export const ChipAddBadge = () => (
  <CirclePlus
    aria-hidden
    className={cn(CHIP_ACTION_BADGE_CLASS, "size-3.5")}
  />
)

export const ChipRemoveBadge = () => (
  <span
    aria-hidden
    className={cn(
      CHIP_ACTION_BADGE_CLASS,
      "flex size-4 items-center justify-center rounded-full bg-background ring-1 ring-border"
    )}
  >
    <XIcon className="size-2.5" />
  </span>
)

export const InsertCaret = () => (
  <span
    aria-hidden
    className="h-7 w-0.5 shrink-0 rounded-full bg-foreground/30"
  />
)

export const EmptySlotChip = () => (
  <span
    aria-hidden
    className="inline-flex h-7 min-w-16 rounded-md border border-dashed border-input/80"
  />
)

export const DragToAddChip = () => (
  <span
    aria-hidden
    className="inline-flex h-7 items-center rounded-md border border-dashed border-input px-2 text-xs text-muted-foreground"
  >
    Drag to add
  </span>
)

export const DragToRemoveChip = () => (
  <span
    aria-hidden
    className="inline-flex h-7 items-center rounded-md border border-dashed border-input px-2 text-xs text-muted-foreground"
  >
    Drag out or click to remove
  </span>
)

export const PoolHint = ({
  poolCount,
  selectedCount,
}: {
  poolCount: number
  selectedCount: number
}) => {
  if (poolCount > 0) return <DragToAddChip />
  if (selectedCount > 0) return <DragToRemoveChip />
  return null
}

export const ChipBin = ({
  binRef,
  active,
}: {
  binRef: (node: HTMLElement | null) => void
  active?: boolean
}) => (
  <div
    ref={binRef}
    aria-label="Drag here to remove"
    className={cn(
      "flex size-8 shrink-0 items-center justify-center rounded-md border border-dashed border-input text-muted-foreground",
      active && "border-destructive/60 bg-destructive/10 text-destructive"
    )}
  >
    <Trash2Icon className="size-3.5" aria-hidden />
  </div>
)
