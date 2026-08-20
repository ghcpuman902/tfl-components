"use client"

import type { ReactNode } from "react"
import {
  ARTWORK,
  MAIN_DISPLAY,
  PHOTO,
  POSTER,
} from "@/components/drafts/hero-3d/composition"
import { useHeroTune } from "@/components/drafts/hero-3d/hero-tune-context"
import {
  SlotScreen,
  useArtworkTexture,
} from "@/components/drafts/hero-3d/slot-screen"

const Frame = ({
  width,
  height,
  depth,
  position,
  bezel = "#2b2420",
  screenName = "screen",
  children,
}: {
  width: number
  height: number
  depth: number
  position: [number, number, number]
  bezel?: string
  screenName?: string
  children: ReactNode
}) => (
  <group position={position}>
    <mesh castShadow receiveShadow>
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial color={bezel} roughness={0.45} />
    </mesh>
    <mesh
      name={screenName}
      position={[0, 0, depth / 2 + 0.001]}
      castShadow={false}
      receiveShadow
    >
      <planeGeometry args={[width - depth * 1.6, height - depth * 1.6]} />
      {children}
    </mesh>
  </group>
)

export const WallObjects = () => {
  const { tune } = useHeroTune()
  const artwork = useArtworkTexture()

  return (
    <group>
      <Frame
        width={MAIN_DISPLAY.width}
        height={MAIN_DISPLAY.height}
        depth={MAIN_DISPLAY.depth}
        position={[tune.displayX, tune.displayY, MAIN_DISPLAY.z]}
        bezel={MAIN_DISPLAY.bezel}
        screenName="liveSlot"
      >
        <SlotScreen
          label="LIVE COMPONENT SLOT"
          width={MAIN_DISPLAY.width}
          height={MAIN_DISPLAY.height}
          background="#111111"
          foreground="#d8d2c8"
        />
      </Frame>

      <Frame
        width={POSTER.width}
        height={POSTER.height}
        depth={POSTER.depth}
        position={[POSTER.x, POSTER.y, POSTER.z]}
        bezel="#5c4634"
      >
        <SlotScreen
          label="HERO COPY SLOT"
          width={POSTER.width}
          height={POSTER.height}
          background="#f4ead9"
          foreground="#3d2c1f"
        />
      </Frame>

      <Frame
        width={PHOTO.width}
        height={PHOTO.height}
        depth={PHOTO.depth}
        position={[PHOTO.x, PHOTO.y, PHOTO.z]}
        bezel="#1c1c1c"
      >
        <SlotScreen
          label="PHOTO SLOT"
          width={PHOTO.width}
          height={PHOTO.height}
          background="#2a2a2a"
          foreground="#cfc8bc"
        />
      </Frame>

      <Frame
        width={ARTWORK.width}
        height={ARTWORK.height}
        depth={ARTWORK.depth}
        position={[ARTWORK.x, ARTWORK.y, ARTWORK.z]}
        bezel="#d9d0c4"
      >
        <meshStandardMaterial map={artwork} roughness={0.78} />
      </Frame>
    </group>
  )
}
