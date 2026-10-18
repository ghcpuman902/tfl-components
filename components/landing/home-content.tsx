import { Suspense } from "react"
import { HomeShortCopy } from "@/components/landing/home-short-copy"
import { LandingFallback, LandingPage } from "@/components/landing/landing-page"
import type { HeroExposure } from "@/lib/landing/hero-experiment"

/**
 * Homepage body. The static shell holds the fallback and the short copy;
 * the scene (and its hero variant) fills the Suspense boundary.
 */
export const HomeContent = ({ hero }: { hero: HeroExposure }) => (
  <>
    <Suspense fallback={<LandingFallback />}>
      <LandingPage hero={hero} />
    </Suspense>
    <HomeShortCopy />
  </>
)
