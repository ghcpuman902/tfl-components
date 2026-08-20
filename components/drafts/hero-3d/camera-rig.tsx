"use client"

import { useRef } from "react"
import { PerspectiveCamera } from "@react-three/drei"
import { useFrame } from "@react-three/fiber"
import {
  MathUtils,
  Vector3,
  type PerspectiveCamera as ThreePerspectiveCamera,
} from "three"
import {
  CAMERA_STATES,
  lerpCamera,
} from "@/components/drafts/hero-3d/composition"
import { useHeroTune } from "@/components/drafts/hero-3d/hero-tune-context"

export const CameraRig = () => {
  const { tune } = useHeroTune()
  const cameraRef = useRef<ThreePerspectiveCamera>(null)
  const lookAt = useRef(new Vector3(...tune.cameraTarget))

  useFrame((state, delta) => {
    const camera = cameraRef.current
    if (!camera) return

    const { width, height } = state.size
    const aspect = width / Math.max(height, 1)
    const framed = lerpCamera(width, aspect)
    const goal = tune.followViewport
      ? framed
      : {
          position: tune.cameraPosition,
          target: tune.cameraTarget,
          fov: tune.fov,
        }

    camera.position.x = MathUtils.damp(
      camera.position.x,
      goal.position[0],
      4.5,
      delta
    )
    camera.position.y = MathUtils.damp(
      camera.position.y,
      goal.position[1],
      4.5,
      delta
    )
    camera.position.z = MathUtils.damp(
      camera.position.z,
      goal.position[2],
      4.5,
      delta
    )
    lookAt.current.x = MathUtils.damp(
      lookAt.current.x,
      goal.target[0],
      4.5,
      delta
    )
    lookAt.current.y = MathUtils.damp(
      lookAt.current.y,
      goal.target[1],
      4.5,
      delta
    )
    lookAt.current.z = MathUtils.damp(
      lookAt.current.z,
      goal.target[2],
      4.5,
      delta
    )
    camera.lookAt(lookAt.current)
    camera.fov = MathUtils.damp(camera.fov, goal.fov, 4.5, delta)
    camera.updateProjectionMatrix()
  })

  return (
    <PerspectiveCamera
      ref={cameraRef}
      makeDefault
      fov={CAMERA_STATES.wide.fov}
      position={[...CAMERA_STATES.wide.position]}
      near={0.08}
      far={40}
    />
  )
}
