"use client"

import { LandingScene } from "@/app/temp/landing-hero/landing-scene"
import { useLandingTrack } from "@/components/landing/landing-analytics"
import type { AnalyticsContext } from "@/lib/analytics/context"
import { elapsedSinceExposureMs } from "@/lib/landing/timing"
import type { LandingBoardIndexes } from "@/lib/tfl/landing-board"

type LandingRoomVariantProps = {
  context: AnalyticsContext
  board: LandingBoardIndexes
}

export const LandingRoomVariant = ({
  context,
  board,
}: LandingRoomVariantProps) => {
  const track = useLandingTrack(context)

  const handleCtaClick = () => {
    track("landing_cta_click")
  }

  return (
    <div className="w-full min-w-0">
      <LandingScene
        production
        board={board}
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
