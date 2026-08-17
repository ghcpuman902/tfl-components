"use client"

import { type ComponentProps, type ReactNode } from "react"
import type { CycleHireDock } from "@/lib/tfl/cycle-hire-types"
import {
  CycleHireDocksProvider,
  useCycleHireDocksData,
} from "@/components/tfl/cycle-hire/cycle-hire-docks-context"
import { CycleHireDocksMap } from "@/components/tfl/cycle-hire/cycle-hire-docks-map"
import { CycleHireDocksDetail } from "@/components/tfl/cycle-hire/cycle-hire-docks-detail"
import { CycleHireDocksDisplay } from "@/components/tfl/cycle-hire/cycle-hire-docks-display"

type RootProps = {
  data?: readonly CycleHireDock[]
  children: ReactNode
}

const DetailFromContext = (
  props: ComponentProps<typeof CycleHireDocksDetail>
) => {
  const data = useCycleHireDocksData(props.data)
  return <CycleHireDocksDetail {...props} data={data} />
}

type CycleHireDocksComponent = ((props: RootProps) => ReactNode) & {
  Provider: typeof CycleHireDocksProvider
  Map: typeof CycleHireDocksMap
  Detail: typeof DetailFromContext
  Display: typeof CycleHireDocksDisplay
}

/**
 * Compound root — inject `data` once, then compose Map, Detail, or Display.
 * Layout chrome (full-screen map, Sheet, floating card) stays in the app.
 *
 * @example
 * <CycleHireDocks data={data}>
 *   <CycleHireDocks.Display tiles={2} />
 *   <CycleHireDocks.Map className="h-dvh" />
 *   <Sheet><CycleHireDocks.Detail hideHeader /></Sheet>
 * </CycleHireDocks>
 */
const CycleHireDocksRoot = ({ data, children }: RootProps) => (
  <CycleHireDocksProvider data={data}>{children}</CycleHireDocksProvider>
)

export const CycleHireDocks = CycleHireDocksRoot as CycleHireDocksComponent
CycleHireDocks.Provider = CycleHireDocksProvider
CycleHireDocks.Map = CycleHireDocksMap
CycleHireDocks.Detail = DetailFromContext
CycleHireDocks.Display = CycleHireDocksDisplay
