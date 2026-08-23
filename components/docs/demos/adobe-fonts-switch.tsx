"use client"

import type { CSSProperties } from "react"
import {
  useFontPreference,
  type FontPreference,
} from "@/components/font-preference-provider"
import { cn } from "@/lib/utils"

type FontProfile = {
  id: FontPreference
  name: string
  description: string
  specimenClassName: string
  fontFamily: string
  titleSettings: string
  titleWeight: 400 | 600
  titleTracking: "0" | "-0.025em"
}

const FONT_PROFILES: readonly FontProfile[] = [
  {
    id: "p22",
    name: "P22 Underground",
    description:
      "This site's default. Closer to Johnston than Hammersmith One. Body stays 400. Titles use 600 and tighter tracking. Needs an Adobe Fonts kit.",
    specimenClassName:
      "font-['p22-underground','Hammersmith_One',sans-serif] font-semibold tracking-tight",
    fontFamily:
      '"p22-underground", "Hammersmith One", "Hammersmith One Fallback", system-ui, sans-serif',
    titleSettings: "600 / -0.025em",
    titleWeight: 600,
    titleTracking: "-0.025em",
  },
  {
    id: "hammersmith",
    name: "Hammersmith One",
    description:
      "Free Google Font with a single 400 cut. Titles stay regular, with normal tracking.",
    specimenClassName:
      "font-['Hammersmith_One',sans-serif] font-normal tracking-normal",
    fontFamily:
      '"Hammersmith One", "Hammersmith One Fallback", system-ui, sans-serif',
    titleSettings: "400 / normal",
    titleWeight: 400,
    titleTracking: "0",
  },
]

const PreviewButton = ({
  active,
  disabled,
  onClick,
}: {
  active: boolean
  disabled?: boolean
  onClick: () => void
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-pressed={active}
    className={cn(
      "shrink-0 rounded-full border border-border px-3 py-1.5 text-xs font-medium transition-colors",
      "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
      active
        ? "bg-foreground text-background"
        : "text-foreground hover:bg-muted",
      "disabled:cursor-not-allowed disabled:opacity-50"
    )}
  >
    {disabled
      ? "Adobe kit required"
      : active
        ? "Previewing this site"
        : "Preview this site"}
  </button>
)

export const FontPreferenceSwitch = () => {
  const { font, setFont, adobeFontsConfigured } = useFontPreference()

  return (
    <div className="space-y-14">
      {FONT_PROFILES.map((profile) => {
        const active = font === profile.id
        const unavailable = profile.id === "p22" && !adobeFontsConfigured

        return (
          <figure
            key={profile.id}
            className="space-y-6"
            style={
              {
                "--tfl-title-weight": profile.titleWeight,
                "--tfl-title-tracking": profile.titleTracking,
                fontFamily: profile.fontFamily,
              } as CSSProperties
            }
          >
            <figcaption className="flex flex-wrap items-center justify-between gap-3">
              <h3
                className={cn(
                  "text-2xl text-foreground",
                  profile.specimenClassName
                )}
              >
                {profile.name}
              </h3>
              <PreviewButton
                active={active}
                disabled={unavailable}
                onClick={() => setFont(profile.id)}
              />
            </figcaption>

            <p className="max-w-prose text-muted-foreground">
              {profile.description}
            </p>

            <div
              className={cn(
                "grid gap-x-12 gap-y-8 lg:grid-cols-[minmax(0,1fr)_20rem]",
                profile.specimenClassName
              )}
            >
              <dl className="space-y-5">
                <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-4">
                  <dt className="pt-1 text-xs font-normal tracking-normal text-muted-foreground">
                    Title
                  </dt>
                  <dd className="space-y-1">
                    <p className="tfl-title text-3xl text-foreground [font-synthesis:none]">
                      Victoria line
                    </p>
                    <code className="block text-[11px] font-normal tracking-normal text-muted-foreground">
                      tfl-title text-2xl
                    </code>
                  </dd>
                </div>
                <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-4">
                  <dt className="pt-0.5 text-xs font-normal tracking-normal text-muted-foreground">
                    Body
                  </dt>
                  <dd className="space-y-1">
                    <p className="text-base font-normal tracking-normal text-foreground [font-synthesis:none]">
                      Minor delays while we fix a signal fault.
                    </p>
                    <code className="block text-[11px] font-normal tracking-normal text-muted-foreground">
                      text-base font-normal
                    </code>
                  </dd>
                </div>
                <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-4">
                  <dt className="pt-0.5 text-xs font-normal tracking-normal text-muted-foreground">
                    Secondary information
                  </dt>
                  <dd className="space-y-1">
                    <p className="text-sm font-normal tracking-normal text-muted-foreground [font-synthesis:none]">
                      Updated 2 minutes ago
                    </p>
                    <code className="block text-[11px] font-normal tracking-normal text-muted-foreground">
                      text-sm text-muted-foreground
                    </code>
                  </dd>
                </div>
              </dl>

              <pre className="overflow-x-auto font-mono text-[10px] leading-4 tracking-normal text-muted-foreground">
                {`ROLE       TYPE                     SETTINGS
title      tfl-title text-2xl       ${profile.titleSettings}
body       text-base                400 / normal
secondary  text-sm muted            400 / normal`}
              </pre>
            </div>
          </figure>
        )
      })}
    </div>
  )
}
