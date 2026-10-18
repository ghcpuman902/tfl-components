import {
  heroVariantCookieString,
  readHeroVariantCookie,
  type HeroVariantId,
} from "@/lib/landing/hero-experiment"

/**
 * Browser side of the hero test. The variant cookie is written only when a
 * counted homepage view fires `hero_view`, so `board_made` is attributed to
 * a variant the visitor actually saw, never to a forced `?hero=` preview.
 */
export const markHeroExposure = (variant: HeroVariantId): void => {
  document.cookie = heroVariantCookieString(
    variant,
    window.location.protocol === "https:"
  )
}

export const readExposedHeroVariant = (): HeroVariantId | null =>
  typeof document === "undefined"
    ? null
    : readHeroVariantCookie(document.cookie)
