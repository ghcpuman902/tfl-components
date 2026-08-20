import { BranchLineStripPicker } from "@/components/docs/demos/branch-strip-demo-controls"
import { DIAGRAM_SCALE_CLASS } from "@/lib/tfl/line-diagram"
import { cn } from "@/lib/utils"

export default function BranchStripHorizontalDemo() {
  return (
    <div className={cn("w-full min-w-0 space-y-10", DIAGRAM_SCALE_CLASS)}>
      <BranchLineStripPicker orientation="horizontal" />
    </div>
  )
}
