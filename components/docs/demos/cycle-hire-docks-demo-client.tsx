"use client";

import { useState } from "react";
import { CycleHireDocks } from "@/components/tfl/cycle-hire/cycle-hire-docks";
import type { CycleHireDock } from "@/lib/tfl/cycle-hire-types";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type Props = {
  data: readonly CycleHireDock[];
};

export const CycleHireDocksDemoClient = ({ data }: Props) => {
  const [showBroken, setShowBroken] = useState(false);

  const handleShowBrokenChange = (checked: boolean) => {
    setShowBroken(checked);
  };

  return (
    <CycleHireDocks data={data}>
      <div className="flex flex-col gap-8">
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">Map</p>
          <CycleHireDocks.Map className="border border-border" />
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-foreground">Detail</p>
            <div className="flex items-center gap-2">
              <Switch
                id="cycle-hire-show-broken"
                checked={showBroken}
                onCheckedChange={handleShowBrokenChange}
                aria-label="Show broken docks"
              />
              <Label
                htmlFor="cycle-hire-show-broken"
                className="text-sm text-muted-foreground"
              >
                Show broken
              </Label>
            </div>
          </div>
          <CycleHireDocks.Detail hideHeader showBroken={showBroken} />
        </div>
      </div>
    </CycleHireDocks>
  );
};
