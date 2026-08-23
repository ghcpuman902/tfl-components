import { heroArtworkThemeStyleSheet } from "@/app/temp/landing-palette/palette"
import { LandingAnalytics } from "@/components/landing/landing-analytics"
import { LandingRoomVariant } from "@/components/landing/landing-room-variant"
import { readHomepageContext } from "@/lib/landing/assignment"
import { LANDING_SCROLL_BOOT_SCRIPT } from "@/lib/landing/space-hash"

const LandingScrollBoot = () => (
  <script
    dangerouslySetInnerHTML={{ __html: LANDING_SCROLL_BOOT_SCRIPT }}
  />
)

export const LandingPage = async () => {
  const context = await readHomepageContext()

  return (
    <>
      <LandingScrollBoot />
      <LandingAnalytics context={context} />
      <style>{heroArtworkThemeStyleSheet()}</style>
      <LandingRoomVariant context={context} />
    </>
  )
}

/** Match the room scroll height so the PPR shell does not collapse into the footer. */
export const LandingFallback = () => (
  <>
    <LandingScrollBoot />
    <style>{heroArtworkThemeStyleSheet()}</style>
    <div
      className="landing-home relative w-full min-w-0"
      aria-hidden
    >
      <div
        className="relative w-full"
        style={{ height: "calc(200dvh - var(--site-header-height))" }}
      >
        <div
          className="sticky"
          style={{
            top: "var(--site-header-height)",
            height: "calc(100dvh - var(--site-header-height))",
          }}
        >
          <div className="landing-hero-paper absolute inset-0" />
        </div>
      </div>
    </div>
  </>
)
