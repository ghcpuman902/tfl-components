import { HomeEditorial } from "@/components/docs/home-editorial"
import { LandingCtaTracker } from "@/components/landing/landing-cta-tracker"
import { LandingDeveloperPath } from "@/components/landing/landing-developer-path"
import { LandingExampleBoard } from "@/components/landing/landing-example-board"
import { LandingFinalCta } from "@/components/landing/landing-final-cta"
import { LandingProofMosaic } from "@/components/landing/landing-proof-mosaic"
import { LandingSetupSteps } from "@/components/landing/landing-setup-steps"
import { LandingSimpleHero } from "@/components/landing/landing-simple-hero"
import { LandingWarmTransition } from "@/components/landing/landing-warm-transition"
import type { AnalyticsContext } from "@/lib/analytics/context"

type LandingSimpleVariantProps = {
  context: AnalyticsContext
}

export const LandingSimpleVariant = ({
  context,
}: LandingSimpleVariantProps) => (
  <div className="@container/main w-full max-w-full min-w-0 overflow-x-clip">
    <LandingSimpleHero context={context} />
    <LandingExampleBoard context={context}>
      <HomeEditorial />
    </LandingExampleBoard>
    <LandingWarmTransition />
    <LandingProofMosaic />
    <LandingSetupSteps />
    <LandingDeveloperPath />
    <LandingCtaTracker context={context}>
      <LandingFinalCta />
    </LandingCtaTracker>
  </div>
)
