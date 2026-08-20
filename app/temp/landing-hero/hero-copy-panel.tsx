"use client"

import type { Ref } from "react"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
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
    className="landing-hero-copy absolute inset-x-0 top-[12%] z-10 mx-auto w-[min(52rem,calc(100%-2rem))] text-center"
  >
    <h1 className="tfl-title text-5xl leading-[1.05] font-bold! [font-synthesis:weight] text-balance md:text-6xl lg:text-7xl">
      Turn any screen into a London transport board.
    </h1>
    <p className="mx-auto mt-5 max-w-xl text-lg font-medium opacity-95 md:text-xl">
      Choose a station, see live arrivals and line status, or use the React
      components to build your own.
    </p>
    <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
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
          "h-10 border-white/80 bg-transparent px-4 text-base text-white hover:bg-white/10 hover:text-white"
        )}
      >
        Read the docs
      </Link>
    </div>
  </section>
)

export const HeroZoomCaption = ({ captionRef }: HeroZoomCaptionProps) => (
  <p
    ref={captionRef}
    className="landing-hero-caption pointer-events-none absolute inset-x-0 bottom-3 z-10 px-4 text-center text-sm opacity-0 md:text-base"
  >
    Live TfL arrivals — right on the screen.
  </p>
)
