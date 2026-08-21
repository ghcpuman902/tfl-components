import type { Ref } from "react"
import { ChevronDownIcon } from "lucide-react"
import { SITE_TAGLINE } from "@/lib/site"
import { cn } from "@/lib/utils"

type LandingFoldCopyProps = {
  className?: string
  copyRef?: Ref<HTMLDivElement | null>
  onContinue?: () => void
}

export const LandingFoldCopy = ({
  className,
  copyRef,
  onContinue,
}: LandingFoldCopyProps) => (
  <div
    ref={copyRef}
    className={cn(
      "landing-fold-copy pointer-events-none mx-auto flex w-full max-w-xl flex-col items-center gap-2 px-4 text-center",
      className
    )}
  >
    <h1 className="text-pretty text-[clamp(1.0625rem,0.95rem+0.45vw,1.25rem)] leading-snug font-normal text-foreground">
      {SITE_TAGLINE}
    </h1>
    {onContinue ? (
      <button
        type="button"
        onClick={onContinue}
        className="pointer-events-auto inline-flex items-center gap-1 text-[clamp(0.9375rem,0.85rem+0.3vw,1rem)] text-foreground underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        See it in the space
        <ChevronDownIcon className="size-4" aria-hidden />
      </button>
    ) : null}
  </div>
)
