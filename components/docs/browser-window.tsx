import { cn } from "@/lib/utils"

type BrowserWindowProps = {
  url?: string
  children: React.ReactNode
  className?: string
}

/** Minimal docs chrome: traffic-light bar and a URL. */
export const BrowserWindow = ({
  url = "localhost:3000",
  children,
  className,
}: BrowserWindowProps) => (
  <div
    className={cn(
      "overflow-hidden rounded-xl border border-border bg-background shadow-sm",
      className
    )}
  >
    <div className="flex items-center gap-3 border-b border-border px-3 py-2">
      <div className="flex gap-1.5" aria-hidden>
        <span className="size-2.5 rounded-full bg-muted-foreground/30" />
        <span className="size-2.5 rounded-full bg-muted-foreground/30" />
        <span className="size-2.5 rounded-full bg-muted-foreground/30" />
      </div>
      <p className="min-w-0 flex-1 truncate text-center text-xs text-muted-foreground">
        {url}
      </p>
      <span className="w-10 shrink-0" aria-hidden />
    </div>
    <div className="p-4 md:p-6">{children}</div>
  </div>
)
