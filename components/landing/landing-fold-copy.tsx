import type { Ref } from "react"
import { ChevronDownIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type LandingFoldCopyProps = {
  className?: string
  copyRef?: Ref<HTMLDivElement | null>
  onContinue?: () => void
}

const foldCopyClassName =
  "tfl-title text-[clamp(1.25rem,1.05rem+1.1vw,1.75rem)] leading-[1.15] text-foreground"

export const LandingFoldCopy = ({
  className,
  copyRef,
  onContinue,
}: LandingFoldCopyProps) => (
  <div
    ref={copyRef}
    className={cn(
      "landing-fold-copy pointer-events-none mx-auto flex w-full max-w-xl flex-col items-center gap-3 px-4 text-center",
      className
    )}
  >
    <h1 className={cn(foldCopyClassName, "flex flex-col items-center")}>
      <span>Turn any screen into a</span>
      <span>London Transport board.</span>
    </h1>
    {onContinue ? (
      <button
        type="button"
        onClick={onContinue}
        className={cn(
          foldCopyClassName,
          "pointer-events-auto inline-flex items-center gap-1 underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
        )}
      >
        See it in the space
        <ChevronDownIcon className="size-5" aria-hidden />
      </button>
    ) : null}
  </div>
)
