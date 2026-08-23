"use client"

import { useEffect, useState } from "react"
import {
  FALLBACK_LONDON_GREETING,
  londonGreetingAt,
} from "@/lib/landing/london-greeting"

/**
 * Always starts with the same greeting on the server and the first client
 * render so SSR HTML matches hydration. The real London-time greeting is
 * applied in an effect.
 */
export const useLondonGreeting = (): string => {
  const [greeting, setGreeting] = useState(FALLBACK_LONDON_GREETING)

  useEffect(() => {
    setGreeting(londonGreetingAt(new Date()))
  }, [])

  return greeting
}
