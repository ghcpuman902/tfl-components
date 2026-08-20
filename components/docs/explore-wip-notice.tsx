import { cn } from "@/lib/utils"

type ExploreWipNoticeProps = {
  className?: string
}

/** Restrained WIP banner for Explorer only — not a site-wide experimental chrome. */
export const ExploreWipNotice = ({ className }: ExploreWipNoticeProps) => (
  <aside
    className={cn(
      "rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground",
      className
    )}
    role="note"
  >
    Explorer is under active product design. Its information model and routes
    will change soon.
  </aside>
)
