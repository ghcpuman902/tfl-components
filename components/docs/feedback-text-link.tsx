import type { ReactNode } from "react"
import { TEXT_LINK_CLASS } from "@/lib/text-link"
import { cn } from "@/lib/utils"

type FeedbackTextLinkProps = {
  children: ReactNode
  className?: string
  /** Capture a viewport screenshot when the dialog opens. Defaults to true. */
  screenshot?: boolean
}

/** Server-safe. CodeCopyDelegator opens the dialog on `[data-open-feedback]`. */
export const FeedbackTextLink = ({
  children,
  className,
  screenshot = true,
}: FeedbackTextLinkProps) => (
  <button
    type="button"
    data-open-feedback=""
    data-feedback-screenshot={screenshot ? undefined : "false"}
    aria-haspopup="dialog"
    className={cn(
      TEXT_LINK_CLASS,
      "cursor-pointer appearance-none border-0 bg-transparent p-0 font-[inherit] text-[length:inherit] leading-[inherit] text-foreground",
      className
    )}
  >
    {children}
  </button>
)
