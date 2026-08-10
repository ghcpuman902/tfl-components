"use client";

import { type ComponentProps, type ReactNode } from "react";
import type { CycleHireDock } from "@/lib/tfl/cycle-hire-types";
import {
  CycleHireDocksProvider,
  useCycleHireDocksData,
} from "@/components/tfl/cycle-hire/cycle-hire-docks-context";
import { CycleHireDocksMap } from "@/components/tfl/cycle-hire/cycle-hire-docks-map";
import { CycleHireDocksDetail } from "@/components/tfl/cycle-hire/cycle-hire-docks-detail";

type RootProps = {
  data?: readonly CycleHireDock[];
  children: ReactNode;
};

const DetailFromContext = (
  props: ComponentProps<typeof CycleHireDocksDetail>,
) => {
  const data = useCycleHireDocksData(props.data);
  return <CycleHireDocksDetail {...props} data={data} />;
};

type CycleHireDocksComponent = ((props: RootProps) => ReactNode) & {
  Provider: typeof CycleHireDocksProvider;
  Map: typeof CycleHireDocksMap;
  Detail: typeof DetailFromContext;
};

/**
 * Compound root — inject `data` once, compose Map and/or Detail as children.
 * Layout chrome (full-screen map, Sheet, floating card) stays in the app.
 *
 * @example
 * <CycleHireDocks data={data}>
 *   <CycleHireDocks.Map className="h-dvh" />
 *   <Sheet><CycleHireDocks.Detail hideHeader /></Sheet>
 * </CycleHireDocks>
 */
const CycleHireDocksRoot = ({ data, children }: RootProps) => (
  <CycleHireDocksProvider data={data}>{children}</CycleHireDocksProvider>
);

export const CycleHireDocks = CycleHireDocksRoot as CycleHireDocksComponent;
CycleHireDocks.Provider = CycleHireDocksProvider;
CycleHireDocks.Map = CycleHireDocksMap;
CycleHireDocks.Detail = DetailFromContext;
