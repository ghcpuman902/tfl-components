import Link from "next/link"
import type { DocsEntry } from "@/lib/docs-catalog"
import { cn } from "@/lib/utils"

type DocsPageActionsProps = {
  prev: DocsEntry | null
  next: DocsEntry | null
  className?: string
}

const ChevronLeftIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden
  >
    <path d="m15 18-6-6 6-6" />
  </svg>
)

const ChevronRightIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden
  >
    <path d="m9 18 6-6-6-6" />
  </svg>
)

const CopyIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden
  >
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </svg>
)

const CheckIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
)

const actionButtonClass =
  "inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-xs font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40"

/**
 * Server-rendered page actions. Copy uses `[data-copy-page]` + CodeCopyDelegator.
 * Prev/Next walk the flat docs sidebar order.
 */
export const DocsPageActions = ({
  prev,
  next,
  className,
}: DocsPageActionsProps) => (
  <div
    className={cn("flex shrink-0 items-center gap-1.5", className)}
    data-copy-page-skip
  >
    <button
      type="button"
      data-copy-page
      data-copied="false"
      aria-label="Copy page"
      className={cn(actionButtonClass, "group/copy")}
    >
      <span className="relative size-3.5 shrink-0" aria-hidden>
        <CopyIcon className="absolute inset-0 size-3.5 transition-opacity group-data-[copied=true]/copy:opacity-0" />
        <CheckIcon className="absolute inset-0 size-3.5 opacity-0 transition-opacity group-data-[copied=true]/copy:opacity-100" />
      </span>
      <span data-mdx-copy-label className="hidden sm:inline">
        Copy page
      </span>
    </button>

    {prev ? (
      <Link
        href={prev.href}
        className={actionButtonClass}
        aria-label={`Previous: ${prev.title}`}
        title={prev.title}
      >
        <ChevronLeftIcon className="size-3.5" />
        <span className="sr-only">Previous</span>
      </Link>
    ) : (
      <span className={cn(actionButtonClass, "opacity-40")} aria-disabled>
        <ChevronLeftIcon className="size-3.5" />
        <span className="sr-only">Previous</span>
      </span>
    )}

    {next ? (
      <Link
        href={next.href}
        className={actionButtonClass}
        aria-label={`Next: ${next.title}`}
        title={next.title}
      >
        <ChevronRightIcon className="size-3.5" />
        <span className="sr-only">Next</span>
      </Link>
    ) : (
      <span className={cn(actionButtonClass, "opacity-40")} aria-disabled>
        <ChevronRightIcon className="size-3.5" />
        <span className="sr-only">Next</span>
      </span>
    )}
  </div>
)
