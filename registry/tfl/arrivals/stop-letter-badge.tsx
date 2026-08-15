import { cn } from "@/lib/utils"

/** Painted bus stop letter — same red circle as the arrivals header. */
export const StopLetterBadge = ({
  letter,
  className,
}: {
  letter: string
  className?: string
}) => (
  <span
    data-line="buses"
    className={cn(
      // Diameter tracks the surrounding text's x-height so the circle
      // sits on the same band as a title or a list label.
      "inline-flex size-[2ex] min-w-[2ex] shrink-0 items-center justify-center rounded-full bg-[var(--line-color)] px-[0.35ex] align-middle text-[1.05ex] leading-none font-bold text-[var(--line-ink)]",
      className
    )}
    aria-label={`Stop ${letter}`}
  >
    {letter}
  </span>
)
