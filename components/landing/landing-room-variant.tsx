"use client"

import { LandingScene } from "@/app/temp/landing-hero/landing-scene"
import { LandingDeveloperPath } from "@/components/landing/landing-developer-path"
import { LandingFinalCta } from "@/components/landing/landing-final-cta"
import { LandingProofMosaic } from "@/components/landing/landing-proof-mosaic"
import { LandingSetupSteps } from "@/components/landing/landing-setup-steps"
import { LandingWarmTransition } from "@/components/landing/landing-warm-transition"
import { useLandingTrack } from "@/components/landing/landing-analytics"
import type { AnalyticsContext } from "@/lib/analytics/context"

type LandingRoomVariantProps = {
  context: AnalyticsContext
}

export const LandingRoomVariant = ({ context }: LandingRoomVariantProps) => {
  const track = useLandingTrack(context)

  const handleCtaClick = () => {
    track("landing_cta_click")
  }

  return (
    <div className="w-full min-w-0">
      <LandingScene
        production
        onCtaClick={handleCtaClick}
        onIpadActivate={() => track("landing_ipad_activate")}
        onZoomComplete={() => track("landing_zoom_complete")}
        onHeroInteraction={() => track("landing_hero_interaction")}
      />
      <LandingWarmTransition />
      <LandingProofMosaic />
      <LandingSetupSteps />
      <LandingDeveloperPath />
      <LandingFinalCta onCtaClick={handleCtaClick} />
    </div>
  )
}
