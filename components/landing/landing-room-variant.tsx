"use client"

import { LandingScene } from "@/app/temp/landing-hero/landing-scene"
import { useLandingTrack } from "@/components/landing/landing-analytics"
import type { AnalyticsContext } from "@/lib/analytics/context"
import { trackHeroEvent } from "@/lib/analytics/track"
import type { HeroExposure } from "@/lib/landing/hero-experiment"
import { elapsedSinceExposureMs } from "@/lib/landing/timing"
import type { LandingBoardIndexes } from "@/lib/tfl/landing-board"

type LandingRoomVariantProps = {
  context: AnalyticsContext
  board: LandingBoardIndexes
  hero: HeroExposure
}

export const LandingRoomVariant = ({
  context,
  board,
  hero,
}: LandingRoomVariantProps) => {
  const track = useLandingTrack(context)

  /** Make my Board, from the hero link (phone) and the room chat (desktop). */
  const handleCtaClick = () => {
    track("landing_cta_click")
    if (hero.counted) trackHeroEvent("hero_cta", hero.variant)
  }

  return (
    <div className="w-full min-w-0">
      <LandingScene
        production
        board={board}
        heroVariant={hero.variant}
        onCtaClick={handleCtaClick}
        onZoomComplete={() => track("landing_zoom_complete")}
        onHeroInteraction={() => track("landing_hero_interaction")}
        onExampleSeen={() => track("landing_example_seen")}
        onExampleInteraction={() =>
          track("landing_example_interaction", {
            time_to_example_interaction_ms: elapsedSinceExposureMs(),
          })
        }
      />
    </div>
  )
}
