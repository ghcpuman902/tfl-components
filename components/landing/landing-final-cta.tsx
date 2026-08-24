import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"
import { TEXT_LINK_CLASS, TEXT_LINK_ICON_CLASS } from "@/lib/text-link"
import { cn } from "@/lib/utils"

type LandingFinalCtaProps = {
  onCtaClick?: () => void
}

export const LandingFinalCta = ({ onCtaClick }: LandingFinalCtaProps) => (
  <section
    aria-labelledby="landing-final-heading"
    className="mx-auto w-full max-w-6xl px-4 pt-8 pb-20 md:px-8"
  >
    <h2
      id="landing-final-heading"
      className="tfl-title text-3xl text-foreground md:text-4xl"
    >
      Give that old screen a better job.
    </h2>
    <Link
      href="/board"
      onClick={onCtaClick}
      className={cn(TEXT_LINK_CLASS, "mt-4 text-lg text-foreground")}
    >
      Set up a board
      <ArrowRightIcon className={cn(TEXT_LINK_ICON_CLASS, "ml-1.5")} aria-hidden />
    </Link>
  </section>
)
