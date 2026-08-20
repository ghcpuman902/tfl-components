import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export const DOCS_BROWSER_PREVIEW_MAX_HEIGHT_CLASS = "max-h-80"
export const DOCS_BROWSER_PREVIEW_ACTION_LABEL = "View full example"

type BrowserWindowProps = {
  url?: string
  children: React.ReactNode
  className?: string
  /**
   * Crop the demo body with a fade. Browser chrome stays full size.
   * Text is not scaled down to fit.
   */
  previewLimit?: boolean
  fullExampleHref?: string
}

/** Minimal docs chrome: traffic-light bar and a URL. */
export const BrowserWindow = ({
  url = "localhost:3000",
  children,
  className,
  previewLimit = false,
  fullExampleHref,
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
    <div
      className={cn(
        "relative",
        previewLimit && cn("overflow-hidden", DOCS_BROWSER_PREVIEW_MAX_HEIGHT_CLASS)
      )}
    >
      <div className="p-4 md:p-6">{children}</div>
      {previewLimit ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex h-24 items-end bg-linear-to-t from-background via-background/85 to-transparent">
          {fullExampleHref ? (
            <Link
              href={fullExampleHref}
              className="pointer-events-auto mb-3 ml-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary underline underline-offset-4 md:ml-6"
            >
              {DOCS_BROWSER_PREVIEW_ACTION_LABEL}
              <ArrowRightIcon className="size-3.5 shrink-0" aria-hidden />
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  </div>
)
