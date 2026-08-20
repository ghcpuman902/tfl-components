import { LineBadgeGroup } from "@/components/tfl/brand/line-badge"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

const EXAMPLES = {
  goldhawk: ["circle", "hammersmith-city"] as const,
  towerHill: ["circle", "district"] as const,
  greatPortland: ["circle", "hammersmith-city", "metropolitan"] as const,
  aldgatEast: ["district", "hammersmith-city"] as const,
  southKen: ["circle", "district"] as const,
  farringdon: ["circle", "hammersmith-city", "metropolitan"] as const,
}

const FixedChipFrame = ({
  label,
  widthClass,
  children,
}: {
  label: string
  widthClass?: string
  children: ReactNode
}) => (
  <div className="space-y-1.5">
    <p className="text-xs text-muted-foreground">{label}</p>
    <div className={cn("max-w-full", widthClass ?? "w-full")}>{children}</div>
  </div>
)

/** Fixed-width shared-track layout + station examples for the MDX body. */
export const LineBadgeSharedTrackLayoutExamples = () => (
  <div className="not-prose my-4 space-y-6">
    <div className="grid gap-3 sm:grid-cols-2">
      <FixedChipFrame label="left" widthClass="w-56">
        <LineBadgeGroup lineIds={EXAMPLES.goldhawk} />
      </FixedChipFrame>
      <FixedChipFrame label="right" widthClass="w-56">
        <LineBadgeGroup lineIds={EXAMPLES.goldhawk} align="right" />
      </FixedChipFrame>
      <FixedChipFrame label="center" widthClass="w-64">
        <LineBadgeGroup lineIds={EXAMPLES.towerHill} align="center" />
      </FixedChipFrame>
      <FixedChipFrame label="under" widthClass="w-64">
        <LineBadgeGroup lineIds={EXAMPLES.farringdon} stripes="under" />
      </FixedChipFrame>
    </div>

    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <FixedChipFrame label="Great Portland Street" widthClass="w-72">
        <LineBadgeGroup lineIds={EXAMPLES.greatPortland} />
      </FixedChipFrame>
      <FixedChipFrame label="Aldgate East" widthClass="w-52">
        <LineBadgeGroup lineIds={EXAMPLES.aldgatEast} />
      </FixedChipFrame>
      <FixedChipFrame label="South Kensington" widthClass="w-40">
        <LineBadgeGroup lineIds={EXAMPLES.southKen} />
      </FixedChipFrame>
      <FixedChipFrame label="Farringdon · under" widthClass="w-full max-w-md">
        <LineBadgeGroup lineIds={EXAMPLES.farringdon} stripes="under" />
      </FixedChipFrame>
      <FixedChipFrame label="Goldhawk Road · right" widthClass="w-48">
        <LineBadgeGroup lineIds={EXAMPLES.goldhawk} align="right" />
      </FixedChipFrame>
      <FixedChipFrame label="Tower Hill · center" widthClass="w-44">
        <LineBadgeGroup lineIds={EXAMPLES.towerHill} align="center" />
      </FixedChipFrame>
    </div>

    <div className="grid gap-3 sm:grid-cols-2">
      <FixedChipFrame label="Row codes · two lines">
        <div className="flex h-12 items-center gap-3">
          <LineBadgeGroup variant="codes" lineIds={EXAMPLES.goldhawk} />
          <span className="text-sm font-medium">Hammersmith</span>
          <span className="ml-auto text-sm font-semibold tabular-nums">
            3 min
          </span>
        </div>
      </FixedChipFrame>
      <FixedChipFrame label="Row codes · three lines">
        <div className="flex h-12 items-center gap-3">
          <LineBadgeGroup variant="codes" lineIds={EXAMPLES.farringdon} />
          <span className="text-sm font-medium">Check Front of Train</span>
          <span className="ml-auto text-sm font-semibold tabular-nums">
            Due
          </span>
        </div>
      </FixedChipFrame>
    </div>
  </div>
)
