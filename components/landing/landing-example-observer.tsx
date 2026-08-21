"use client"

import { useEffect, useRef } from "react"

type LandingExampleObserverProps = {
  targetId: string
  onSeen: () => void
}

export const LandingExampleObserver = ({
  targetId,
  onSeen,
}: LandingExampleObserverProps) => {
  const seen = useRef(false)

  useEffect(() => {
    const target = document.getElementById(targetId)
    if (!target || seen.current) return

    let timer = 0
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry || entry.intersectionRatio < 0.5) {
          window.clearTimeout(timer)
          return
        }
        timer = window.setTimeout(() => {
          if (seen.current) return
          seen.current = true
          onSeen()
          observer.disconnect()
        }, 1000)
      },
      { threshold: 0.5 }
    )
    observer.observe(target)
    return () => {
      window.clearTimeout(timer)
      observer.disconnect()
    }
  }, [onSeen, targetId])

  return null
}
