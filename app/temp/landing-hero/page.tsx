import type { Metadata } from "next"
import { Suspense } from "react"
import { heroArtworkThemeStyleSheet } from "@/app/temp/landing-palette/palette"
import { LandingScene } from "./landing-scene"
import { PostHeroPlaceholder } from "./post-hero-placeholder"
import { getLandingBoardIndexes } from "@/lib/tfl/landing-board"

export const metadata: Metadata = {
  title: "Landing hero (temp)",
  description:
    "Temp test: 2.5D room scene with scroll-controlled pull-back from a framed iPad.",
  robots: { index: false, follow: false },
}

export default function LandingHeroTempPage() {
  const board = getLandingBoardIndexes()
  return (
    <div className="w-full min-w-0">
      <style>{heroArtworkThemeStyleSheet()}</style>
      <p className="sr-only">Temp landing hero test — not linked in nav.</p>
      <Suspense
        fallback={<div className="landing-hero-paper h-svh" aria-hidden />}
      >
        <LandingScene board={board} />
      </Suspense>
      <PostHeroPlaceholder />
    </div>
  )
}
