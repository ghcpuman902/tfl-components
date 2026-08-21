"use client"

import Link from "next/link"
import { ArrowDownIcon, ArrowRightIcon } from "lucide-react"
import { useLandingTrack } from "@/components/landing/landing-analytics"
import type { AnalyticsContext } from "@/lib/analytics/context"
import { HOME_RAIL_STOP } from "@/lib/tfl/home-arrivals-stops"

type LandingSimpleHeroProps = {
  context: AnalyticsContext
}

export const LandingSimpleHero = ({ context }: LandingSimpleHeroProps) => {
  const track = useLandingTrack(context)

  return (
    <>
      <section className="mx-auto flex min-h-[min(20rem,calc(100svh-var(--site-header-height)))] w-full max-w-6xl flex-col justify-center gap-6 px-4 pt-8 pb-6 md:px-8">
        <p className="max-w-2xl text-2xl text-foreground md:text-4xl">
          Want a live TfL board like this:{" "}
          <Link
            href="/board"
            onClick={() => track("landing_cta_click")}
            className="inline-flex items-center gap-1.5 underline underline-offset-4"
          >
            It’s easy
            <ArrowRightIcon className="size-[1em] shrink-0" aria-hidden />
          </Link>
        </p>
        <a
          href="#landing-example-board"
          className="inline-flex size-11 items-center justify-center text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-label="See the live example"
        >
          <ArrowDownIcon className="size-6" aria-hidden />
        </a>
      </section>
      <p className="mx-auto w-full max-w-6xl px-4 text-sm text-muted-foreground md:px-8">
        Example · {HOME_RAIL_STOP.name}
      </p>
    </>
  )
}
