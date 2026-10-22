"use client"

import { useSyncExternalStore } from "react"
import {
  switchCustomiseVariant,
  useCustomiseVariant,
} from "@/components/board/customise/use-customise-variant"
import { CUSTOMISE_VARIANTS } from "@/lib/tfl/board-customise-variant"
import { cn } from "@/lib/utils"

const NON_PRODUCTION =
  process.env.NODE_ENV !== "production" ||
  (process.env.NEXT_PUBLIC_VERCEL_ENV !== undefined &&
    process.env.NEXT_PUBLIC_VERCEL_ENV !== "production")

const noop = () => () => undefined
const devParam = () =>
  new URLSearchParams(window.location.search).get("dev") === "1"

/**
 * Dev-only variant switcher: `?dev=1`, or any non-production build. Fixed in
 * a corner, so it never moves the page.
 */
export const CustomiseDevSwitcher = () => {
  const visible = useSyncExternalStore(
    noop,
    () => NON_PRODUCTION || devParam(),
    () => false
  )
  const { variant } = useCustomiseVariant()
  if (!visible) return null
  return (
    <div
      role="group"
      aria-label="Customise variant (dev)"
      className="fixed bottom-14 left-2 z-[60] flex border border-foreground/40 bg-background text-sm md:bottom-2"
    >
      {CUSTOMISE_VARIANTS.map((item) => (
        <button
          key={item}
          type="button"
          aria-pressed={variant === item}
          className={cn(
            "min-h-11 min-w-11 px-2",
            variant === item && "bg-foreground text-background"
          )}
          onClick={() => switchCustomiseVariant(item)}
        >
          {item === "panel" ? "Panel" : item.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
