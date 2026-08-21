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

/** Match the room scroll height so the PPR shell does not collapse into the footer. */
export const LandingFallback = () => (
  <>
    <style>{heroArtworkThemeStyleSheet()}</style>
    <div
      className="landing-home relative w-full min-w-0 overflow-x-clip"
      aria-hidden
    >
      <div
        className="relative w-full"
        style={{ height: "calc(200svh - var(--site-header-height))" }}
      >
        <div
          className="sticky"
          style={{
            top: "var(--site-header-height)",
            height: "calc(100svh - var(--site-header-height))",
          }}
        >
          <div className="landing-hero-paper absolute inset-0" />
        </div>
      </div>
    </div>
  </>
)
