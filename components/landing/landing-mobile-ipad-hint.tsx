"use client"

import { useEffect, useRef, type RefObject } from "react"
import { ArrowDown, CirclePlus } from "lucide-react"

type LandingMobileIpadHintProps = {
  hostRef: RefObject<HTMLElement | null>
  targetRef: RefObject<SVGGraphicsElement | null>
  enabled: boolean
}

export const LandingMobileIpadHint = ({
  hostRef,
  targetRef,
  enabled,
}: LandingMobileIpadHintProps) => {
  const hintRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current
    const hint = hintRef.current
    if (!enabled || !host || !hint) return

    let frame = 0
    const paint = () => {
      const target = targetRef.current
      const hostRect = host.getBoundingClientRect()
      if (!target) {
        hint.style.opacity = "0"
        frame = window.requestAnimationFrame(paint)
        return
      }
      const rect = target.getBoundingClientRect()
      hint.style.opacity = "1"
      hint.style.left = `${rect.left + rect.width / 2 - hostRect.left}px`
      hint.style.top = `${rect.top - hostRect.top - 8}px`
      frame = window.requestAnimationFrame(paint)
    }
    frame = window.requestAnimationFrame(paint)
    return () => window.cancelAnimationFrame(frame)
  }, [enabled, hostRef, targetRef])

  if (!enabled) return null

  return (
    <div
      ref={hintRef}
      aria-hidden
      className="pointer-events-none absolute z-20 flex -translate-x-1/2 -translate-y-full flex-col items-center text-white"
    >
      <p className="flex items-center gap-1 text-xs font-medium">
        Tap
        <CirclePlus className="size-4" strokeWidth={2.25} />
        to see the board
      </p>
      <ArrowDown className="size-4" strokeWidth={2.25} />
    </div>
  )
}
