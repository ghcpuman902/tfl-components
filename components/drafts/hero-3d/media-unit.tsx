"use client"

import { useHeroTune } from "@/components/drafts/hero-3d/hero-tune-context"
import { MEDIA_UNIT } from "@/components/drafts/hero-3d/composition"

export const MediaUnit = () => {
  const { tune } = useHeroTune()
  const height = tune.mediaUnitHeight
  const top = MEDIA_UNIT.topThickness
  const plinth = Math.min(MEDIA_UNIT.plinthHeight, height * 0.12)
  const bodyHeight = Math.max(height - top - plinth, 0.12)
  const bodyY = plinth + bodyHeight / 2
  const topY = plinth + bodyHeight + top / 2
  const plinthY = plinth / 2
  const doorWidth = MEDIA_UNIT.width * 0.24
  const drawerWidth = MEDIA_UNIT.width * 0.48

  return (
    <group position={[0, 0, MEDIA_UNIT.z]} receiveShadow castShadow>
      <mesh position={[0, plinthY, 0]} castShadow receiveShadow>
        <boxGeometry
          args={[
            MEDIA_UNIT.width - MEDIA_UNIT.plinthInset * 2,
            plinth,
            MEDIA_UNIT.depth - MEDIA_UNIT.plinthInset,
          ]}
        />
        <meshStandardMaterial color={MEDIA_UNIT.body} roughness={0.86} />
      </mesh>
      <mesh position={[0, bodyY, 0]} castShadow receiveShadow>
        <boxGeometry args={[MEDIA_UNIT.width, bodyHeight, MEDIA_UNIT.depth]} />
        <meshStandardMaterial color={MEDIA_UNIT.body} roughness={0.9} />
      </mesh>
      <mesh
        position={[
          -MEDIA_UNIT.width * 0.38,
          bodyY,
          MEDIA_UNIT.depth / 2 + 0.001,
        ]}
        receiveShadow
      >
        <planeGeometry args={[doorWidth * 0.92, bodyHeight * 0.88]} />
        <meshStandardMaterial color="#ebe6de" roughness={0.92} />
      </mesh>
      <mesh
        position={[
          MEDIA_UNIT.width * 0.38,
          bodyY,
          MEDIA_UNIT.depth / 2 + 0.001,
        ]}
        receiveShadow
      >
        <planeGeometry args={[doorWidth * 0.92, bodyHeight * 0.88]} />
        <meshStandardMaterial color="#ebe6de" roughness={0.92} />
      </mesh>
      <mesh
        position={[0, bodyY + bodyHeight * 0.2, MEDIA_UNIT.depth / 2 + 0.001]}
        receiveShadow
      >
        <planeGeometry args={[drawerWidth * 0.92, bodyHeight * 0.36]} />
        <meshStandardMaterial color="#e8e2d8" roughness={0.92} />
      </mesh>
      <mesh
        position={[0, bodyY - bodyHeight * 0.22, MEDIA_UNIT.depth / 2 + 0.001]}
        receiveShadow
      >
        <planeGeometry args={[drawerWidth * 0.92, bodyHeight * 0.36]} />
        <meshStandardMaterial color="#e8e2d8" roughness={0.92} />
      </mesh>
      <mesh position={[0, topY, 0]} castShadow receiveShadow>
        <boxGeometry
          args={[MEDIA_UNIT.width + 0.02, top, MEDIA_UNIT.depth + 0.02]}
        />
        <meshStandardMaterial color={MEDIA_UNIT.oak} roughness={0.62} />
      </mesh>
    </group>
  )
}
