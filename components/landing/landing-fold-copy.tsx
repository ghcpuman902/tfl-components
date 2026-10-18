import type { CSSProperties, Ref } from "react"
import Link from "next/link"
import { ArrowRightIcon, ChevronDownIcon } from "lucide-react"
import { HeroLines } from "@/components/landing/hero-lines"
import {
  HERO_DEFAULT_VARIANT,
  type HeroVariantId,
} from "@/lib/landing/hero-experiment"
import { HERO_RESERVED_LINES, HERO_VARIANTS } from "@/lib/landing/hero-variants"
import { TEXT_LINK_CLASS, TEXT_LINK_ICON_CLASS } from "@/lib/text-link"
import { cn } from "@/lib/utils"

type LandingFoldCopyProps = {
  /** Hero headline test variant. Every variant gets the same box. */
  variant?: HeroVariantId
  className?: string
  copyRef?: Ref<HTMLDivElement | null>
  onContinue?: () => void
  onBoardClick?: () => void
}

/*
 * Type and widths here are mirrored in `lib/landing/hero-type.ts`. The
 * tagline shape gate measures with them and `hero-type.test.ts` fails on
 * drift.
 */
const foldCopyClassName =
  "tfl-title text-[clamp(1.25rem,1.05rem+1.1vw,1.75rem)] leading-[1.15] text-foreground"

const sublineClassName =
  "text-[clamp(0.9375rem,0.85rem+0.45vw,1.125rem)] leading-[1.35] text-muted-foreground"

/** Reserve the tallest variant's lines so no variant moves the scene. */
const reservedLines = {
  "--hl-sm": HERO_RESERVED_LINES.headline.sm,
  "--hl-md": HERO_RESERVED_LINES.headline.md,
  "--hl-lg": HERO_RESERVED_LINES.headline.lg,
  "--sl-sm": HERO_RESERVED_LINES.subline.sm,
  "--sl-md": HERO_RESERVED_LINES.subline.md,
  "--sl-lg": HERO_RESERVED_LINES.subline.lg,
} as CSSProperties

export const LandingFoldCopy = ({
  variant = HERO_DEFAULT_VARIANT,
  className,
  copyRef,
  onContinue,
  onBoardClick,
}: LandingFoldCopyProps) => {
  const copy = HERO_VARIANTS[variant]
  return (
    <div
      ref={copyRef}
      style={reservedLines}
      className={cn(
        "landing-fold-copy pointer-events-none mx-auto flex w-full max-w-xl flex-col items-center gap-3 px-4 text-center",
        className
      )}
    >
      <h1
        className={cn(
          foldCopyClassName,
          "min-h-[calc(var(--hero-lines)*1.15em)] w-full text-balance [--hero-lines:var(--hl-sm)] md:[--hero-lines:var(--hl-md)] lg:[--hero-lines:var(--hl-lg)]"
        )}
      >
        <HeroLines chunks={copy.headline} breaks={copy.headlineBreaks} />
      </h1>
      <p
        className={cn(
          sublineClassName,
          "min-h-[calc(var(--hero-lines)*1.35em)] w-full text-balance [--hero-lines:var(--sl-sm)] md:[--hero-lines:var(--sl-md)] lg:[--hero-lines:var(--sl-lg)]"
        )}
      >
        <HeroLines chunks={copy.subline} breaks={copy.sublineBreaks} />
      </p>
      <Link
        href="/board"
        onClick={onBoardClick}
        className={cn(
          foldCopyClassName,
          TEXT_LINK_CLASS,
          "pointer-events-auto focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none md:hidden"
        )}
      >
        Make my own Board
        <ArrowRightIcon
          className={cn(TEXT_LINK_ICON_CLASS, "ml-1")}
          aria-hidden
        />
      </Link>
      {onContinue ? (
        <button
          type="button"
          onClick={onContinue}
          className={cn(
            foldCopyClassName,
            TEXT_LINK_CLASS,
            "pointer-events-auto focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none max-md:hidden"
          )}
        >
          See it in the space
          <ChevronDownIcon
            className={cn(TEXT_LINK_ICON_CLASS, "ml-1")}
            aria-hidden
          />
        </button>
      ) : null}
    </div>
  )
}
