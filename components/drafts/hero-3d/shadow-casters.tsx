"use client"

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import {
  DoubleSide,
  MeshDepthMaterial,
  RGBADepthPacking,
  type Group,
  type Texture,
} from "three"
import { useTexture } from "@react-three/drei"
import {
  ASSETS,
  SHADOW_CASTERS,
  lerpAlong,
  sunPositionFromAngles,
  type Vec3,
} from "@/components/drafts/hero-3d/composition"
import { useHeroTune } from "@/components/drafts/hero-3d/hero-tune-context"
import { stencilToAlphaMap } from "@/components/drafts/hero-3d/textures"

const ROOM_AIM: Vec3 = [0, 1.25, 0.15]

const CutoutPlane = ({
  alphaMap,
  size,
  position,
}: {
  alphaMap: Texture
  size: readonly [number, number]
  position: Vec3
}) => {
  const depthMaterial = useMemo(
    () =>
      new MeshDepthMaterial({
        alphaMap,
        alphaTest: 0.35,
        depthPacking: RGBADepthPacking,
      }),
    [alphaMap]
  )

  return (
    <mesh
      position={[...position]}
      lookAt={ROOM_AIM}
      castShadow
      customDepthMaterial={depthMaterial}
    >
      <planeGeometry args={[size[0], size[1]]} />
      <meshBasicMaterial
        alphaMap={alphaMap}
        alphaTest={0.35}
        colorWrite={false}
        shadowSide={DoubleSide}
        side={DoubleSide}
        toneMapped={false}
      />
    </mesh>
  )
}

export const ShadowCasters = () => {
  const { tune } = useHeroTune()
  const windowSource = useTexture(ASSETS.window) as Texture
  const leafSource = useTexture(ASSETS.leaves) as Texture
  const leafGroup = useRef<Group>(null)
  const reducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  )

  const windowAlpha = useMemo(
    () => stencilToAlphaMap(windowSource.clone()),
    [windowSource]
  )
  const leafAlpha = useMemo(
    () => stencilToAlphaMap(leafSource.clone()),
    [leafSource]
  )

  const sun = sunPositionFromAngles(tune.sunAzimuth, tune.sunElevation)
  const windowPos = lerpAlong(sun, ROOM_AIM, SHADOW_CASTERS.windowT)
  const leafPos = lerpAlong(sun, ROOM_AIM, SHADOW_CASTERS.leafT)

  useFrame((state) => {
    const group = leafGroup.current
    if (!group || reducedMotion) return
    const t = state.clock.elapsedTime
    group.rotation.z = Math.sin(t * 0.28) * 0.014
    group.rotation.y = Math.sin(t * 0.17) * 0.01
    group.position.x = Math.sin(t * 0.21) * 0.02
  })

  return (
    <group>
      <CutoutPlane
        alphaMap={windowAlpha}
        size={SHADOW_CASTERS.windowSize}
        position={windowPos}
      />
      <group ref={leafGroup}>
        <CutoutPlane
          alphaMap={leafAlpha}
          size={SHADOW_CASTERS.leafSize}
          position={leafPos}
        />
      </group>
    </group>
  )
}
