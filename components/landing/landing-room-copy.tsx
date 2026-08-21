import type { Ref } from "react"
import { cn } from "@/lib/utils"

type LandingRoomTaglineProps = {
  copyRef?: Ref<HTMLParagraphElement | null>
  visible?: boolean
}

export const LandingRoomTagline = ({
  copyRef,
  visible = false,
}: LandingRoomTaglineProps) => (
  <p
    ref={copyRef}
    className={cn(
      "landing-hero-copy tfl-title pointer-events-none absolute inset-x-0 top-0 z-10 px-4 pt-[max(4rem,calc(env(safe-area-inset-top)+2.5rem))] text-center text-[clamp(2.25rem,5.5vw,5.75rem)] leading-[1.08] font-bold! [font-synthesis:weight] md:pt-8",
      visible ? "opacity-100" : "opacity-0"
    )}
  >
    Turn any screen into a London transport board.
  </p>
)
