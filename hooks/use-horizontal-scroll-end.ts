"use client"

import { useEffect, useRef, useState } from "react"

const END_THRESHOLD_PX = 2

/** Keeps a right-edge scroll cue visible until the final content is in view. */
export const useHorizontalScrollEnd = <T extends HTMLElement>() => {
  const scrollRef = useRef<T>(null)
  const [showEndFade, setShowEndFade] = useState(false)

  useEffect(() => {
    const element = scrollRef.current
    if (!element) return

    let frame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const remaining =
          element.scrollWidth - element.clientWidth - element.scrollLeft
        setShowEndFade(remaining > END_THRESHOLD_PX)
      })
    }

    update()
    element.addEventListener("scroll", update, { passive: true })
    const observer = new ResizeObserver(update)
    observer.observe(element)

    return () => {
      cancelAnimationFrame(frame)
      element.removeEventListener("scroll", update)
      observer.disconnect()
    }
  }, [])

  return { scrollRef, showEndFade }
}
