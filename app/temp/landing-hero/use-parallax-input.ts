"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type RefObject,
} from "react"

type OrientationPermission = {
  requestPermission?: () => Promise<"granted" | "denied" | "default">
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

const hasFinePointer = () => window.matchMedia("(pointer: fine)").matches

const needsOrientationPermission = () =>
  typeof DeviceOrientationEvent !== "undefined" &&
  typeof (DeviceOrientationEvent as unknown as OrientationPermission)
    .requestPermission === "function"

const COARSE_QUERY = "(pointer: coarse)"

const subscribeCoarsePointer = (onChange: () => void) => {
  const media = window.matchMedia(COARSE_QUERY)
  media.addEventListener("change", onChange)
  return () => media.removeEventListener("change", onChange)
}

const getCoarsePointer = () => window.matchMedia(COARSE_QUERY).matches

type UseParallaxInputArgs = {
  stageRef: RefObject<HTMLElement | null>
  enabled: boolean
}

export const useParallaxInput = ({
  stageRef,
  enabled,
}: UseParallaxInputArgs) => {
  const valueRef = useRef(0)
  const pointerActiveRef = useRef(false)
  const [tiltEnabled, setTiltEnabled] = useState(false)
  const isCoarse = useSyncExternalStore(
    subscribeCoarsePointer,
    getCoarsePointer,
    () => false
  )

  const requestTilt = useCallback(async () => {
    if (!needsOrientationPermission()) {
      setTiltEnabled(true)
      return
    }
    try {
      const permission = await (
        DeviceOrientationEvent as unknown as OrientationPermission
      ).requestPermission!()
      if (permission === "granted") setTiltEnabled(true)
    } catch {
      setTiltEnabled(false)
    }
  }, [])

  useEffect(() => {
    if (!enabled) {
      valueRef.current = 0
      return
    }

    const handlePointerMove = (event: PointerEvent) => {
      const stage = stageRef.current
      if (!stage || !hasFinePointer()) return
      pointerActiveRef.current = true
      const rect = stage.getBoundingClientRect()
      if (rect.width <= 0) return
      const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1
      valueRef.current = clamp(nx, -1, 1)
    }

    const handlePointerLeave = () => {
      pointerActiveRef.current = false
    }

    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (!tiltEnabled || pointerActiveRef.current) return
      const gamma = event.gamma ?? 0
      valueRef.current = clamp(gamma / 30, -1, 1)
    }

    const handleScrollFallback = () => {
      if (pointerActiveRef.current || tiltEnabled) return
      const doc = document.documentElement
      const max = doc.scrollHeight - window.innerHeight
      if (max <= 0) return
      const progress = clamp(window.scrollY / max, 0, 1)
      valueRef.current = Math.sin(progress * Math.PI) * 0.7
    }

    const stage = stageRef.current
    stage?.addEventListener("pointermove", handlePointerMove)
    stage?.addEventListener("pointerleave", handlePointerLeave)
    window.addEventListener("deviceorientation", handleOrientation)
    window.addEventListener("scroll", handleScrollFallback, { passive: true })
    handleScrollFallback()

    return () => {
      stage?.removeEventListener("pointermove", handlePointerMove)
      stage?.removeEventListener("pointerleave", handlePointerLeave)
      window.removeEventListener("deviceorientation", handleOrientation)
      window.removeEventListener("scroll", handleScrollFallback)
    }
  }, [enabled, stageRef, tiltEnabled])

  return {
    valueRef,
    requestTilt,
    showTiltButton: enabled && isCoarse && !tiltEnabled,
  }
}
