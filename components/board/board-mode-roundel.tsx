import { PlaceholderRoundelSvg } from "@/components/tfl/brand/tfl-roundel"
import {
  BOARD_SETTINGS,
  type BoardScope,
  type BoardSettingId,
} from "@/lib/tfl/board-settings"
import type { RoundelPreset } from "@/lib/tfl/roundel-presets"
import { cn } from "@/lib/utils"

const SCOPE_ROUNDEL: Record<BoardScope, RoundelPreset | null> = {
  arrivals: "underground",
  status: "tfl",
  bus: "buses",
  river: "river",
  cycle: "cycles",
  shell: null,
}

const SETTING_ROUNDEL: Partial<Record<BoardSettingId, RoundelPreset>> = {
  stop: "underground",
  stopName: "underground",
}

export const roundelForSetting = (
  setting: BoardSettingId
): RoundelPreset | null =>
  SETTING_ROUNDEL[setting] ?? SCOPE_ROUNDEL[BOARD_SETTINGS[setting].scope]

export const BoardModeRoundel = ({
  variant,
  className,
}: {
  variant: RoundelPreset
  className?: string
}) => (
  <PlaceholderRoundelSvg
    variant={variant}
    text=""
    className={cn("size-3 shrink-0", className)}
    aria-hidden
  />
)
