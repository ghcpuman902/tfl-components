"use client"

import { useSyncExternalStore } from "react"
import {
  FALLBACK_LONDON_GREETING,
  londonGreetingAt,
} from "@/lib/landing/london-greeting"

const subscribeNever = () => () => {}

const getClientGreeting = (): string => londonGreetingAt(new Date())

const getServerGreeting = (): string => FALLBACK_LONDON_GREETING

/**
 * Always starts with the same greeting on the server and the first client
 * render so SSR HTML matches hydration. The real London-time greeting is
 * applied right after hydration.
 */
export const useLondonGreeting = (): string =>
  useSyncExternalStore(subscribeNever, getClientGreeting, getServerGreeting)
