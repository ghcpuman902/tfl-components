"use client"

import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

let registered = false

export const getLandingGsap = () => {
  if (!registered && typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger)
    // Resize is owned by useIpadZoom (throttled + settle). GSAP's default
    // `resize` auto-refresh would recast the camera on every window event.
    ScrollTrigger.config({
      autoRefreshEvents: "visibilitychange,DOMContentLoaded,load",
    })
    registered = true
  }
  return { gsap, ScrollTrigger }
}
