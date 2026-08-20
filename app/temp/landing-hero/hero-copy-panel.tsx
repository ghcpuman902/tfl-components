"use client"

import type { Ref } from "react"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { HOME_RAIL_STOP } from "@/lib/tfl/home-arrivals-stops"
import { cn } from "@/lib/utils"

type HeroCopyPanelProps = {
  copyRef: Ref<HTMLElement | null>
}

type HeroZoomCaptionProps = {
  captionRef: Ref<HTMLElement | null>
}

export const HeroCopyPanel = ({ copyRef }: HeroCopyPanelProps) => (
  <section
    ref={copyRef}
    className="landing-hero-copy pointer-events-none absolute inset-0 z-10 flex flex-col items-center px-4 pt-[max(4rem,calc(env(safe-area-inset-top)+2.5rem))] text-center md:pt-8"
  >
    <h1 className="tfl-title mt-4 w-full text-[clamp(2.25rem,5.5vw,5.75rem)] leading-[1.08] font-bold! [font-synthesis:weight] md:mt-8">
      Turn any screen into a
      <br className="max-sm:hidden" />{" "}
      London transport board.
    </h1>
    <div data-hero-actions className="pointer-events-auto mt-3 w-full md:mt-4">
      <p className="mx-auto whitespace-nowrap text-lg font-medium text-shadow-lg opacity-95 max-md:whitespace-normal md:text-xl">
        Choose a station, see live arrivals and line status, or use the React
        components to build your own.
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/board"
          className={cn(
            buttonVariants({ size: "lg" }),
            "h-10 bg-white px-4 text-base text-black hover:bg-white/90"
          )}
        >
          Set up a board
        </Link>
        <Link
          href="/docs"
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }),
            "h-10 border-white/40 bg-white/60 px-4 text-base text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] backdrop-blur-md backdrop-saturate-150 hover:bg-white/75 hover:text-black"
          )}
        >
          Read the docs
        </Link>
      </div>
    </div>
  </section>
)

export const HeroZoomCaption = ({ captionRef }: HeroZoomCaptionProps) => (
  <p
    ref={captionRef}
    className="landing-hero-caption pointer-events-none absolute inset-x-0 bottom-3 z-10 px-4 text-center text-sm opacity-0 md:text-base"
  >
    <Link
      href="/board"
      className="rounded-sm underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
    >
      Showing ‘{HOME_RAIL_STOP.name}’ board,{" "}
      <span className="underline underline-offset-4">set up your own →</span>
    </Link>
  </p>
)
