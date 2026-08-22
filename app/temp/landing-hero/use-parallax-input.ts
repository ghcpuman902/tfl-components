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

type ParallaxValue = {
  x: number
  y: number
}

type UseParallaxInputArgs = {
  stageRef: RefObject<HTMLElement | null>
  enabled: boolean
}

export const useParallaxInput = ({
  stageRef,
  enabled,
}: UseParallaxInputArgs) => {
  const valueRef = useRef<ParallaxValue>({ x: 0, y: 0 })
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
      valueRef.current.x = 0
      valueRef.current.y = 0
      pointerActiveRef.current = false
      return
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (!hasFinePointer()) return
      const stage = stageRef.current
      if (!stage) return
      const rect = stage.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return
      const inside =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom
      if (!inside) {
        pointerActiveRef.current = false
        valueRef.current.y = 0
        if (!tiltEnabled) valueRef.current.x = 0
        return
      }
      pointerActiveRef.current = true
      const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1
      const ny = ((event.clientY - rect.top) / rect.height) * 2 - 1
      valueRef.current.x = clamp(nx, -1, 1)
      valueRef.current.y = clamp(ny, -1, 1)
    }

    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (!tiltEnabled || pointerActiveRef.current) return
      const gamma = event.gamma ?? 0
      valueRef.current.x = clamp(gamma / 30, -1, 1)
      valueRef.current.y = 0
    }

    window.addEventListener("pointermove", handlePointerMove, { passive: true })
    window.addEventListener("deviceorientation", handleOrientation)

    return () => {
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("deviceorientation", handleOrientation)
    }
  }, [enabled, stageRef, tiltEnabled])

  return {
    valueRef,
    requestTilt,
    showMotionUnlock: enabled && isCoarse && !tiltEnabled,
  }
}
