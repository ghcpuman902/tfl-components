import type { CSSProperties } from "react"
import { heroArtworkThemeStyleSheet } from "@/app/temp/landing-palette/palette"
import { LandingAnalytics } from "@/components/landing/landing-analytics"
import { LandingRoomVariant } from "@/components/landing/landing-room-variant"
import { readHomepageContext } from "@/lib/landing/assignment"
import type { HeroExposure } from "@/lib/landing/hero-experiment"
import { getLandingBoardIndexes } from "@/lib/tfl/landing-board"
import { LANDING_SCROLL_BOOT_SCRIPT } from "@/lib/landing/space-hash"
import {
  LANDING_HERO_HEIGHT,
  LANDING_RUNWAY_DESKTOP_HEIGHT,
  LANDING_VIEWPORT_BOOT_SCRIPT,
} from "@/lib/landing/hero-viewport"

/**
 * Before React: measure the stable hero height once (see
 * `lib/landing/hero-viewport.ts`) and stop a restored scroll flashing the room.
 */
const LandingScrollBoot = () => (
  <script
    dangerouslySetInnerHTML={{
      __html: `${LANDING_VIEWPORT_BOOT_SCRIPT};${LANDING_SCROLL_BOOT_SCRIPT}`,
    }}
  />
)

export const LandingPage = async ({ hero }: { hero: HeroExposure }) => {
  const context = await readHomepageContext()
  const board = getLandingBoardIndexes()

  return (
    <>
      <LandingScrollBoot />
      <LandingAnalytics context={context} hero={hero} />
      <style>{heroArtworkThemeStyleSheet()}</style>
      <LandingRoomVariant context={context} board={board} hero={hero} />
    </>
  )
}

/**
 * Phone shell is one viewport. From `md`, match the room scroll height so
 * the PPR shell does not collapse into the footer.
 */
export const LandingFallback = () => (
  <>
    <LandingScrollBoot />
    <style>{heroArtworkThemeStyleSheet()}</style>
    <div
      className="landing-home relative w-full min-w-0"
      style={
        {
          "--landing-hero-height": LANDING_HERO_HEIGHT,
          "--landing-runway-height": LANDING_RUNWAY_DESKTOP_HEIGHT,
        } as CSSProperties
      }
      aria-hidden
    >
      <div className="landing-scroll-runway relative h-(--landing-hero-height) w-full md:h-(--landing-runway-height)">
        <div className="landing-hero-stage relative h-(--landing-hero-height) md:sticky md:top-(--site-header-height)">
          <div className="landing-hero-paper absolute inset-0" />
        </div>
      </div>
    </div>
  </>
)
