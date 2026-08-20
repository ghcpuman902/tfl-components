"use client"

import type { Ref } from "react"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { HOME_RAIL_STOP } from "@/lib/tfl/home-arrivals-stops"
import { cn } from "@/lib/utils"

type LandingRoomCopyProps = {
  copyRef: Ref<HTMLElement | null>
  onCtaClick?: () => void
}

export const LandingRoomCopy = ({
  copyRef,
  onCtaClick,
}: LandingRoomCopyProps) => (
  <section
    ref={copyRef}
    className="landing-hero-copy pointer-events-none absolute inset-0 z-10 flex flex-col items-center px-4 pt-[max(4rem,calc(env(safe-area-inset-top)+2.5rem))] text-center md:pt-8"
  >
    <h1 className="tfl-title mt-4 w-full text-[clamp(2.25rem,5.5vw,5.75rem)] leading-[1.08] font-bold! [font-synthesis:weight] md:mt-8">
      Turn any screen into a London transport board.
    </h1>
    <div data-hero-actions className="pointer-events-auto mt-3 w-full md:mt-4">
      <p className="mx-auto max-w-2xl text-lg font-medium text-shadow-lg opacity-95 md:text-xl">
        Choose a stop and get the useful live arrivals, line status and nearby
        services.
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/board"
          onClick={onCtaClick}
          className={cn(
            buttonVariants({ size: "lg" }),
            "h-10 bg-white px-4 text-base text-black hover:bg-white/90"
          )}
        >
          Set up a board
        </Link>
      </div>
    </div>
  </section>
)

type LandingRoomCaptionProps = {
  captionRef: Ref<HTMLParagraphElement | null>
  onCtaClick?: () => void
}

export const LandingRoomCaption = ({
  captionRef,
  onCtaClick,
}: LandingRoomCaptionProps) => (
  <p
    ref={captionRef}
    className="landing-hero-caption pointer-events-none absolute inset-x-0 bottom-3 z-10 px-4 text-center text-sm opacity-0 md:text-base"
  >
    {HOME_RAIL_STOP.name} is only an example.{" "}
    <Link
      href="/board"
      onClick={onCtaClick}
      className="pointer-events-auto underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
    >
      Make yours →
    </Link>
  </p>
)
