"use client"

import { Suspense, useMemo } from "react"
import { Canvas } from "@react-three/fiber"
import { ContactShadows } from "@react-three/drei"
import { PCFSoftShadowMap } from "three"
import { CameraRig } from "@/components/drafts/hero-3d/camera-rig"
import {
  CAMERA_STATES,
  MEDIA_UNIT,
  ROOM,
  SUN,
  sunPositionFromAngles,
} from "@/components/drafts/hero-3d/composition"
import { useHeroTune } from "@/components/drafts/hero-3d/hero-tune-context"
import { MediaUnit } from "@/components/drafts/hero-3d/media-unit"
import { PlantBillboard } from "@/components/drafts/hero-3d/plant-billboard"
import { SceneProps } from "@/components/drafts/hero-3d/props"
import { ShadowCasters } from "@/components/drafts/hero-3d/shadow-casters"
import { WallObjects } from "@/components/drafts/hero-3d/wall-objects"

const Room = () => (
  <group>
    <mesh position={[0, ROOM.wallHeight / 2, 0]} receiveShadow>
      <boxGeometry
        args={[ROOM.wallWidth, ROOM.wallHeight, ROOM.wallThickness]}
      />
      <meshStandardMaterial color={ROOM.wallColor} roughness={0.94} />
    </mesh>
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, ROOM.floorDepth / 2]}
      receiveShadow
    >
      <planeGeometry args={[ROOM.wallWidth + 0.4, ROOM.floorDepth]} />
      <meshStandardMaterial color={ROOM.floorColor} roughness={0.9} />
    </mesh>
  </group>
)

const Lights = () => {
  const { tune } = useHeroTune()
  const sun = useMemo(
    () => sunPositionFromAngles(tune.sunAzimuth, tune.sunElevation),
    [tune.sunAzimuth, tune.sunElevation]
  )

  return (
    <>
      <ambientLight intensity={SUN.ambientIntensity} color="#f4eadc" />
      <hemisphereLight
        color={SUN.hemisphereSky}
        groundColor={SUN.hemisphereGround}
        intensity={SUN.hemisphereIntensity}
      />
      <directionalLight
        position={[...sun]}
        intensity={SUN.intensity}
        color={SUN.color}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.00025}
        shadow-normalBias={0.03}
        shadow-camera-near={1.5}
        shadow-camera-far={20}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={3.6}
        shadow-camera-bottom={-2.4}
      />
    </>
  )
}

export const HeroScene = () => (
  <Canvas
    shadows
    dpr={[1, 1.75]}
    gl={{ antialias: true }}
    camera={{
      fov: CAMERA_STATES.wide.fov,
      position: [...CAMERA_STATES.wide.position],
      near: 0.08,
      far: 40,
    }}
    onCreated={({ gl }) => {
      gl.shadowMap.enabled = true
      gl.shadowMap.type = PCFSoftShadowMap
    }}
    style={{ background: "#d7c7b0" }}
  >
    <Suspense fallback={null}>
      <CameraRig />
      <Lights />
      <Room />
      <WallObjects />
      <MediaUnit />
      <PlantBillboard />
      <SceneProps />
      <ShadowCasters />
      <ContactShadows
        position={[0, 0.002, MEDIA_UNIT.z]}
        opacity={0.38}
        scale={5}
        blur={2.1}
        far={1.4}
        color="#5c4d3d"
        frames={1}
      />
    </Suspense>
  </Canvas>
)
