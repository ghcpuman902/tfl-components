import { cn } from "@/lib/utils"

/** Top-right “new” via `::after` — parent must be `relative` with room on the right. */
export const newMarkerClassName =
  "after:pointer-events-none after:absolute after:right-2 after:text-[10px] after:leading-none after:font-bold after:text-blue-500 after:content-['new']"

export const newMarkerParentClassName = (className?: string) =>
  cn("relative", newMarkerClassName, className)
