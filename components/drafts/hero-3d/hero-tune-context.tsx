"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import {
  CAMERA_STATES,
  MAIN_DISPLAY,
  MEDIA_UNIT,
  SUN,
  type Vec3,
} from "@/components/drafts/hero-3d/composition"

export type HeroTune = {
  followViewport: boolean
  cameraPosition: Vec3
  cameraTarget: Vec3
  fov: number
  sunAzimuth: number
  sunElevation: number
  displayX: number
  displayY: number
  mediaUnitHeight: number
}

const DEFAULT_TUNE: HeroTune = {
  followViewport: true,
  cameraPosition: CAMERA_STATES.wide.position,
  cameraTarget: CAMERA_STATES.wide.target,
  fov: CAMERA_STATES.wide.fov,
  sunAzimuth: SUN.azimuth,
  sunElevation: SUN.elevation,
  displayX: MAIN_DISPLAY.x,
  displayY: MAIN_DISPLAY.y,
  mediaUnitHeight: MEDIA_UNIT.height,
}

type HeroTuneContextValue = {
  tune: HeroTune
  setTune: (patch: Partial<HeroTune>) => void
  resetTune: () => void
}

const HeroTuneContext = createContext<HeroTuneContextValue | null>(null)

export const HeroTuneProvider = ({ children }: { children: ReactNode }) => {
  const [tune, setTuneState] = useState<HeroTune>(DEFAULT_TUNE)

  const setTune = useCallback((patch: Partial<HeroTune>) => {
    setTuneState((current) => ({ ...current, ...patch }))
  }, [])

  const resetTune = useCallback(() => {
    setTuneState(DEFAULT_TUNE)
  }, [])

  const value = useMemo(
    () => ({ tune, setTune, resetTune }),
    [tune, setTune, resetTune]
  )

  return (
    <HeroTuneContext.Provider value={value}>
      {children}
    </HeroTuneContext.Provider>
  )
}

export const useHeroTune = () => {
  const value = useContext(HeroTuneContext)
  if (!value)
    throw new Error("useHeroTune must be used within HeroTuneProvider")
  return value
}
