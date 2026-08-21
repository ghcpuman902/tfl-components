import { heroArtworkThemeStyleSheet } from "@/app/temp/landing-palette/palette"
import { LandingAnalytics } from "@/components/landing/landing-analytics"
import { LandingRoomVariant } from "@/components/landing/landing-room-variant"
import { readHomepageContext } from "@/lib/landing/assignment"

export const LandingPage = async () => {
  const context = await readHomepageContext()

  return (
    <>
      <LandingAnalytics context={context} />
      <style>{heroArtworkThemeStyleSheet()}</style>
      <LandingRoomVariant context={context} />
    </>
  )
}

export const LandingFallback = () => (
  <div className="landing-home w-full min-w-0" aria-hidden>
    <div
      className="mx-auto mt-4 w-[min(92vw,calc((100dvh-var(--site-header-height)-6.5rem)*1.421))]"
      style={{ aspectRatio: "125.7409 / 88.4773" }}
    />
  </div>
)
