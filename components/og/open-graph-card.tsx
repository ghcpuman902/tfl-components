import { PlaceholderRoundelSvg } from "@/registry/tfl/brand/tfl-roundel"
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site"

/** Same greys as the header rest mark (`HeaderRoundel`). */
const HEADER_DISC = "#cecece"
const HEADER_BAR = "#888888"

/**
 * Homepage-faithful Open Graph card. Rendered on `/temp/og-preview` at
 * 1200×630 so it can be screenshotted with P22 Underground loaded.
 */
export const OpenGraphCard = () => (
  <div
    data-og-card
    className="flex h-[630px] w-[1200px] flex-col justify-center bg-white px-[88px] text-[#0a0a0a]"
  >
    <div className="flex items-center gap-[22px]">
      <PlaceholderRoundelSvg
        framed={false}
        ringColor={HEADER_DISC}
        barColor={HEADER_BAR}
        className="h-[96px] w-auto shrink-0"
        aria-hidden
      />
      <p className="tfl-title text-[52px] leading-none [font-synthesis:none] text-[#0a0a0a]">
        {SITE_NAME}
      </p>
    </div>
    <p className="tfl-title mt-8 max-w-[960px] text-[36px] leading-[1.2] [font-synthesis:none] text-[#171717]">
      {SITE_TAGLINE}
    </p>
  </div>
)
