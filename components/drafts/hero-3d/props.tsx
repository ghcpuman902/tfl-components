"use client"

import { DoubleSide } from "three"
import { useHeroTune } from "@/components/drafts/hero-3d/hero-tune-context"
import { MEDIA_UNIT } from "@/components/drafts/hero-3d/composition"

export const SceneProps = () => {
  const { tune } = useHeroTune()
  const topY = tune.mediaUnitHeight
  const z = MEDIA_UNIT.z + 0.02

  return (
    <group>
      <group position={[0.08, topY, z]} castShadow>
        <mesh position={[0, 0.025, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.28, 0.05, 0.22]} />
          <meshStandardMaterial color="#2a241f" roughness={0.55} />
        </mesh>
        <mesh
          position={[0, 0.058, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          castShadow
        >
          <cylinderGeometry args={[0.09, 0.09, 0.012, 32]} />
          <meshStandardMaterial
            color="#3b332c"
            roughness={0.35}
            metalness={0.25}
          />
        </mesh>
        <mesh position={[0.07, 0.08, 0.02]} rotation={[0, 0, 0.45]} castShadow>
          <boxGeometry args={[0.12, 0.012, 0.012]} />
          <meshStandardMaterial color="#111111" roughness={0.4} />
        </mesh>
      </group>

      <group position={[0.86, topY, z + 0.02]}>
        <mesh position={[0, 0.015, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.055, 0.07, 0.03, 24]} />
          <meshStandardMaterial color="#d7c4a3" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.2, 0]} castShadow>
          <cylinderGeometry args={[0.012, 0.012, 0.36, 12]} />
          <meshStandardMaterial
            color="#cbb79a"
            roughness={0.55}
            metalness={0.15}
          />
        </mesh>
        <mesh position={[0, 0.4, 0]} castShadow>
          <coneGeometry args={[0.11, 0.14, 24, 1, true]} />
          <meshStandardMaterial
            color="#f4efe6"
            roughness={0.82}
            side={DoubleSide}
          />
        </mesh>
        <pointLight
          position={[0, 0.34, 0]}
          intensity={0.35}
          distance={1.8}
          color="#ffe8c4"
        />
      </group>
    </group>
  )
}
