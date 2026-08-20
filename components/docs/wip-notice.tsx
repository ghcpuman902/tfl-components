import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type WipNoticeProps = {
  children: ReactNode
  className?: string
}

/** Restrained work-in-progress note for incomplete sections. */
export const WipNotice = ({ children, className }: WipNoticeProps) => (
  <aside
    className={cn(
      "rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground",
      className
    )}
    role="note"
  >
    {children}
  </aside>
)
