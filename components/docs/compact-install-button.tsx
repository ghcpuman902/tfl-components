import { cn } from "@/lib/utils"

type CompactInstallButtonProps = {
  registryUrl: string
  className?: string
}

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

/**
 * One-click install CTA for the first fold. Copies the pnpm shadcn add command.
 * Full package-manager tabs stay in the Installation section below.
 */
export const CompactInstallButton = ({
  registryUrl,
  className,
}: CompactInstallButtonProps) => {
  const command = `pnpm dlx shadcn@latest add ${registryUrl}`

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 text-sm text-muted-foreground",
        className
      )}
    >
      <button
        type="button"
        data-copy-text={command}
        data-copied="false"
        aria-label="Copy install command"
        className="group/copy inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <span className="relative size-3.5 shrink-0" aria-hidden>
          <CopyIcon className="absolute inset-0 size-3.5 transition-opacity group-data-[copied=true]/copy:opacity-0" />
          <CheckIcon className="absolute inset-0 size-3.5 opacity-0 transition-opacity group-data-[copied=true]/copy:opacity-100" />
        </span>
        <span data-mdx-copy-label>Copy install command</span>
      </button>
      <span>Installable via shadcn CLI</span>
    </div>
  )
}
