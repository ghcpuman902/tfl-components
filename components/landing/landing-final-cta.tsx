import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"

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
      className="mt-4 inline-flex items-center gap-1.5 text-lg text-foreground underline underline-offset-4"
    >
      Set up a board
      <ArrowRightIcon className="size-[1em] shrink-0" aria-hidden />
    </Link>
  </section>
)
