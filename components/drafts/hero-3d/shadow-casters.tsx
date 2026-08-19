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
import {
  SHADOW_CASTERS,
  lerpAlong,
  sunPositionFromAngles,
  type Vec3,
} from "@/components/drafts/hero-3d/composition"
import { useHeroTune } from "@/components/drafts/hero-3d/hero-tune-context"
import {
  makeLeafLayerAlphaMap,
  makeWindowApertureAlphaMap,
} from "@/components/drafts/hero-3d/textures"

/** Wall aim — casters face the set so sun projects leaves → panes → wall. */
const ROOM_AIM: Vec3 = [0, 1.4, 0.1]

const CutoutPlane = ({
  alphaMap,
  size,
  position,
  alphaTest = 0.28,
}: {
  alphaMap: Texture
  size: readonly [number, number]
  position: Vec3
  alphaTest?: number
}) => {
  const depthMaterial = useMemo(
    () =>
      new MeshDepthMaterial({
        alphaMap,
        alphaTest,
        depthPacking: RGBADepthPacking,
        side: DoubleSide,
      }),
    [alphaMap, alphaTest]
  )

  return (
    <mesh
      position={[...position]}
      lookAt={ROOM_AIM}
      castShadow
      customDepthMaterial={depthMaterial}
      frustumCulled={false}
    >
      <planeGeometry args={[size[0], size[1]]} />
      <meshBasicMaterial
        alphaMap={alphaMap}
        alphaTest={alphaTest}
        colorWrite={false}
        depthWrite={false}
        shadowSide={DoubleSide}
        side={DoubleSide}
        toneMapped={false}
      />
    </mesh>
  )
}

export const ShadowCasters = () => {
  const { tune } = useHeroTune()
  const leafGroup = useRef<Group>(null)
  const reducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  )

  // Generated gobos — no PNG dependency for window / foliage.
  const windowAlpha = useMemo(() => makeWindowApertureAlphaMap(), [])
  const leafLayers = useMemo(
    () =>
      SHADOW_CASTERS.leafLayers.map((layer) => ({
        ...layer,
        alphaMap: makeLeafLayerAlphaMap(layer.seed, 1600, 1600, layer.density),
      })),
    []
  )

  const sun = sunPositionFromAngles(tune.sunAzimuth, tune.sunElevation)
  // Closer to sun first: foliage dapples the beam, then aperture shapes the pool.
  const windowPos = lerpAlong(sun, ROOM_AIM, SHADOW_CASTERS.windowT)

  useFrame((state) => {
    const group = leafGroup.current
    if (!group || reducedMotion) return
    const t = state.clock.elapsedTime
    group.rotation.z = Math.sin(t * 0.22) * 0.012
    group.rotation.y = Math.sin(t * 0.15) * 0.008
    group.children.forEach((child, index) => {
      child.position.x = Math.sin(t * 0.18 + index * 1.1) * 0.018
      child.rotation.z = Math.sin(t * 0.25 + index) * 0.01
    })
  })

  return (
    <group>
      <group ref={leafGroup}>
        {leafLayers.map((layer) => (
          <CutoutPlane
            key={layer.seed}
            alphaMap={layer.alphaMap}
            size={layer.size}
            position={lerpAlong(sun, ROOM_AIM, layer.t)}
            alphaTest={0.22}
          />
        ))}
      </group>
      <CutoutPlane
        alphaMap={windowAlpha}
        size={SHADOW_CASTERS.windowSize}
        position={windowPos}
        alphaTest={0.4}
      />
    </group>
  )
}
