"use client"

import { createContext, useContext, useMemo, type ReactNode } from "react"
import type { CycleHireDock } from "@/lib/tfl/cycle-hire-types"

type CycleHireDocksContextValue = {
  data: readonly CycleHireDock[]
}

const CycleHireDocksContext = createContext<CycleHireDocksContextValue | null>(
  null
)

const EMPTY_DOCKS: readonly CycleHireDock[] = []
const EMPTY_VALUE: CycleHireDocksContextValue = { data: EMPTY_DOCKS }

type ProviderProps = {
  data?: readonly CycleHireDock[]
  children: ReactNode
}

/**
 * Optional shared-data parent for Map + Detail surfaces.
 * Prefer passing `data` explicitly on each surface when only one is mounted.
 */
export const CycleHireDocksProvider = ({ data, children }: ProviderProps) => {
  const value = useMemo<CycleHireDocksContextValue>(
    () => (data == null ? EMPTY_VALUE : { data }),
    [data]
  )

  return (
    <CycleHireDocksContext.Provider value={value}>
      {children}
    </CycleHireDocksContext.Provider>
  )
}

/** Read docks from an explicit `data` prop, else the nearest Provider. */
export const useCycleHireDocksData = (
  data?: readonly CycleHireDock[]
): readonly CycleHireDock[] => {
  const ctx = useContext(CycleHireDocksContext)
  return data ?? ctx?.data ?? EMPTY_DOCKS
}
