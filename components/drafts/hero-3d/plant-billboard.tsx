"use client"

import { useMemo } from "react"
import { Billboard, useTexture } from "@react-three/drei"
import {
  DoubleSide,
  MeshDepthMaterial,
  RGBADepthPacking,
  type Texture,
} from "three"
import { ASSETS, MEDIA_UNIT } from "@/components/drafts/hero-3d/composition"
import { useHeroTune } from "@/components/drafts/hero-3d/hero-tune-context"
import { plantAlphaFromBlack } from "@/components/drafts/hero-3d/textures"

export const PlantBillboard = () => {
  const { tune } = useHeroTune()
  const source = useTexture(ASSETS.plant) as Texture
  const maps = useMemo(() => {
    const colorMap = source.clone()
    colorMap.needsUpdate = true
    const alphaMap = plantAlphaFromBlack(colorMap)
    return { colorMap, alphaMap }
  }, [source])

  const depthMaterial = useMemo(
    () =>
      new MeshDepthMaterial({
        alphaMap: maps.alphaMap,
        alphaTest: 0.45,
        depthPacking: RGBADepthPacking,
      }),
    [maps.alphaMap]
  )

  const height = 0.92
  const width = height * 0.72
  const y = tune.mediaUnitHeight + height / 2 - 0.02

  return (
    <Billboard position={[-0.88, y, MEDIA_UNIT.z + 0.04]} follow>
      <mesh castShadow receiveShadow customDepthMaterial={depthMaterial}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial
          map={maps.colorMap}
          alphaMap={maps.alphaMap}
          alphaTest={0.45}
          transparent
          roughness={0.72}
          side={DoubleSide}
        />
      </mesh>
    </Billboard>
  )
}
