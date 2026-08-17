"use client"

import { useState } from "react"
import { CycleHireDocks } from "@/components/tfl/cycle-hire/cycle-hire-docks"
import type { CycleHireDock } from "@/lib/tfl/cycle-hire-types"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

type Props = {
  data: readonly CycleHireDock[]
}

export const CycleHireDocksDemoClient = ({ data }: Props) => {
  const [showBroken, setShowBroken] = useState(false)
  const primaryDock = data[0]

  const handleShowBrokenChange = (checked: boolean) => {
    setShowBroken(checked)
  }

  return (
    <CycleHireDocks data={data}>
      <div className="flex flex-col gap-8">
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">Compact display</p>
          <div className="space-y-5">
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Multiple docks</p>
              <CycleHireDocks.Display
                tiles={3}
                behaviour="unattended"
                showBroken={showBroken}
              />
            </div>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">One dock</p>
              <CycleHireDocks.Display
                data={primaryDock ? [primaryDock] : []}
                tiles={2}
                showBroken={showBroken}
              />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-foreground">Single dock</p>
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
          <CycleHireDocks.Detail
            data={primaryDock ? [primaryDock] : []}
            hideHeader
            showBroken={showBroken}
          />
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">Nearby docks</p>
          <CycleHireDocks.Map />
        </div>
      </div>
    </CycleHireDocks>
  )
}
