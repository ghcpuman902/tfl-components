"use client"

import { useRef, type ReactNode } from "react"
import { LandingExampleObserver } from "@/components/landing/landing-example-observer"
import { useLandingTrack } from "@/components/landing/landing-analytics"
import type { AnalyticsContext } from "@/lib/analytics/context"
import { elapsedSinceExposureMs } from "@/lib/landing/timing"

type LandingExampleBoardProps = {
  context: AnalyticsContext
  children: ReactNode
}

export const LandingExampleBoard = ({
  context,
  children,
}: LandingExampleBoardProps) => {
  const track = useLandingTrack(context)
  const interacted = useRef(false)

  return (
    <div
      id="landing-example-board"
      onPointerDown={() => {
        if (interacted.current) return
        interacted.current = true
        track("landing_example_interaction", {
          time_to_example_interaction_ms: elapsedSinceExposureMs(),
        })
      }}
    >
      <LandingExampleObserver
        targetId="landing-example-board"
        onSeen={() => track("landing_example_seen")}
      />
      {children}
    </div>
  )
}
