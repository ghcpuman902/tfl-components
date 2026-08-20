import type { ReactNode } from "react"

type FeedbackTextLinkProps = {
  children: ReactNode
}

/** Server-safe. CodeCopyDelegator opens the dialog on `[data-open-feedback]`. */
export const FeedbackTextLink = ({ children }: FeedbackTextLinkProps) => (
  <button
    type="button"
    data-open-feedback=""
    className="text-foreground underline underline-offset-4"
  >
    {children}
  </button>
)
