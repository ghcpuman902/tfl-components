"use client"

import {
  Component,
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { useAnimations, useGLTF } from "@react-three/drei"
import { useFrame } from "@react-three/fiber"
import {
  Color,
  DoubleSide,
  LoopRepeat,
  MeshStandardMaterial,
  type Group,
  type Material,
  type Mesh,
  type Object3D,
} from "three"
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js"
import { ASSETS } from "@/components/drafts/hero-3d/composition"
import {
  useHeroTune,
  type HeroTune,
} from "@/components/drafts/hero-3d/hero-tune-context"

/**
 * Grove → Blender → this slot.
 *
 * 1. Block out here (this file’s volume tree).
 * 2. Grow and prune in The Grove.
 * 3. Bake a slow cyclic branch sway (6–12 s, first frame = last frame).
 * 4. Export glTF Binary (.glb), +Y up, origin at the soil line,
 *    1 Blender unit = 1 m, Apply Modifiers, Draco and/or Meshopt,
 *    animation sampled at ~6–8 fps. Name meshes bark|wood|trunk|branch
 *    vs leaf|twig|foliage so materials can be retinted.
 * 5. Drop the file at `public/drafts/hero-3d/tree.glb` and tune below.
 *
 * Prefer leaf cards + alpha clip. Keep the file under ~2 MB.
 * Colour, roughness, and shadows are owned by the website, not the export.
 */

const PLANTER_SOIL_Y = 0.078
const LEAF_NAME = /leaf|leaves|twig|twigs|foliage|canopy|needle/i
const BARK_NAME = /bark|wood|trunk|branch|stem|stick/i

const hslColor = (h: number, s: number, l: number) =>
  new Color().setHSL((((h % 360) + 360) % 360) / 360, s, l)

const isMesh = (object: Object3D): object is Mesh =>
  (object as Mesh).isMesh === true

const materialsOf = (mesh: Mesh): Material[] =>
  Array.isArray(mesh.material) ? mesh.material : [mesh.material]

const isStandard = (material: Material): material is MeshStandardMaterial =>
  material instanceof MeshStandardMaterial

const looksLikeLeaf = (mesh: Mesh, material: Material) => {
  const name = `${mesh.name} ${material.name}`
  if (LEAF_NAME.test(name)) return true
  if (BARK_NAME.test(name)) return false
  return (
    material.transparent ||
    ("alphaMap" in material && Boolean(material.alphaMap)) ||
    ("alphaTest" in material && Number(material.alphaTest) > 0)
  )
}

const usePrefersReducedMotion = () =>
  useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  )

const useGroveGlbStatus = () => {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    const check = async () => {
      try {
        const head = await fetch(ASSETS.tree, { method: "HEAD" })
        if (!cancelled && head.ok) {
          setReady(true)
          return
        }
        if (head.status === 405) {
          const get = await fetch(ASSETS.tree, { method: "GET" })
          if (!cancelled) setReady(get.ok)
        }
      } catch {
        if (!cancelled) setReady(false)
      }
    }
    void check()
    return () => {
      cancelled = true
    }
  }, [])

  return ready
}

type GroveBoundaryProps = {
  fallback: ReactNode
  children: ReactNode
}

class GroveLoadBoundary extends Component<
  GroveBoundaryProps,
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (this.state.failed) return this.props.fallback
    return this.props.children
  }
}

const Planter = ({ bark }: { bark: Color }) => (
  <group>
    <mesh position={[0, 0.04, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[0.075, 0.062, 0.08, 24]} />
      <meshStandardMaterial color="#b6835c" roughness={0.78} />
    </mesh>
    <mesh position={[0, PLANTER_SOIL_Y, 0]} receiveShadow>
      <cylinderGeometry args={[0.066, 0.066, 0.01, 24]} />
      <meshStandardMaterial color={bark} roughness={0.95} />
    </mesh>
  </group>
)

const TreeBlockout = ({
  reducedMotion,
  leaf,
  bark,
  leafRoughness,
  barkRoughness,
  animationSpeed,
}: {
  reducedMotion: boolean
  leaf: Color
  bark: Color
  leafRoughness: number
  barkRoughness: number
  animationSpeed: number
}) => {
  const canopy = useRef<Group>(null)

  useFrame((state) => {
    const group = canopy.current
    if (!group || reducedMotion) return
    const t = state.clock.elapsedTime * animationSpeed
    group.rotation.z = Math.sin(t * 0.35) * 0.018
    group.rotation.x = Math.sin(t * 0.22) * 0.01
  })

  return (
    <group>
      <mesh position={[0, 0.16, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.014, 0.022, 0.32, 10]} />
        <meshStandardMaterial color={bark} roughness={barkRoughness} />
      </mesh>
      <mesh
        position={[0.04, 0.3, 0.01]}
        rotation={[0, 0, 0.55]}
        castShadow
        receiveShadow
      >
        <cylinderGeometry args={[0.008, 0.012, 0.2, 8]} />
        <meshStandardMaterial color={bark} roughness={barkRoughness} />
      </mesh>
      <mesh
        position={[-0.035, 0.34, -0.01]}
        rotation={[0.15, 0, -0.5]}
        castShadow
        receiveShadow
      >
        <cylinderGeometry args={[0.007, 0.011, 0.18, 8]} />
        <meshStandardMaterial color={bark} roughness={barkRoughness} />
      </mesh>
      <group ref={canopy}>
        <mesh position={[0.02, 0.52, 0.02]} castShadow receiveShadow>
          <sphereGeometry args={[0.16, 16, 12]} />
          <meshStandardMaterial
            color={leaf}
            roughness={leafRoughness}
          />
        </mesh>
        <mesh position={[-0.08, 0.62, -0.03]} castShadow receiveShadow>
          <sphereGeometry args={[0.13, 16, 12]} />
          <meshStandardMaterial
            color={leaf}
            roughness={leafRoughness}
          />
        </mesh>
        <mesh position={[0.09, 0.7, -0.02]} castShadow receiveShadow>
          <sphereGeometry args={[0.11, 16, 12]} />
          <meshStandardMaterial
            color={leaf}
            roughness={leafRoughness}
          />
        </mesh>
      </group>
    </group>
  )
}

type TreeLook = Pick<
  HeroTune,
  | "barkHue"
  | "barkLit"
  | "barkRoughness"
  | "barkSat"
  | "leafAlphaTest"
  | "leafHue"
  | "leafLit"
  | "leafRoughness"
  | "leafSat"
>

const applyTreeMaterials = (root: Object3D, look: TreeLook) => {
  const leaf = hslColor(look.leafHue, look.leafSat, look.leafLit)
  const bark = hslColor(look.barkHue, look.barkSat, look.barkLit)

  root.traverse((object) => {
    if (!isMesh(object)) return
    object.castShadow = true
    object.receiveShadow = true
    for (const material of materialsOf(object)) {
      if (!isStandard(material)) continue
      const leafPart = looksLikeLeaf(object, material)
      material.color.copy(leafPart ? leaf : bark)
      material.roughness = leafPart
        ? look.leafRoughness
        : look.barkRoughness
      if (leafPart) {
        material.alphaTest = look.leafAlphaTest
        material.transparent = false
        material.side = DoubleSide
        material.depthWrite = true
      }
      material.needsUpdate = true
    }
  })
}

const GroveTree = ({ reducedMotion }: { reducedMotion: boolean }) => {
  const { tune } = useHeroTune()
  const gltf = useGLTF(ASSETS.tree, true, true)
  const root = useMemo(() => {
    const cloned = cloneSkinned(gltf.scene) as Group
    cloned.traverse((object) => {
      if (!isMesh(object)) return
      object.material = Array.isArray(object.material)
        ? object.material.map((material) => material.clone())
        : object.material.clone()
    })
    return cloned
  }, [gltf.scene])
  const sway = useRef<Group>(null)
  const { actions, mixer } = useAnimations(gltf.animations, root)
  const hasBakedWind = gltf.animations.length > 0

  const treeLook = useMemo<TreeLook>(
    () => ({
      barkHue: tune.barkHue,
      barkLit: tune.barkLit,
      barkRoughness: tune.barkRoughness,
      barkSat: tune.barkSat,
      leafAlphaTest: tune.leafAlphaTest,
      leafHue: tune.leafHue,
      leafLit: tune.leafLit,
      leafRoughness: tune.leafRoughness,
      leafSat: tune.leafSat,
    }),
    [
      tune.barkHue,
      tune.barkLit,
      tune.barkRoughness,
      tune.barkSat,
      tune.leafAlphaTest,
      tune.leafHue,
      tune.leafLit,
      tune.leafRoughness,
      tune.leafSat,
    ]
  )

  useLayoutEffect(() => {
    applyTreeMaterials(root, treeLook)
  }, [root, treeLook])

  useEffect(() => {
    if (reducedMotion || !hasBakedWind) return
    const playing = Object.values(actions).filter(
      (action): action is NonNullable<typeof action> => action !== null
    )
    for (const action of playing) {
      action.reset()
      action.setLoop(LoopRepeat, Infinity)
      action.clampWhenFinished = false
      action.timeScale = tune.treeAnimationSpeed
      action.play()
    }
    return () => {
      mixer.stopAllAction()
    }
  }, [actions, hasBakedWind, mixer, reducedMotion, tune.treeAnimationSpeed])

  useFrame((state) => {
    const group = sway.current
    if (!group || reducedMotion || hasBakedWind) return
    const t = state.clock.elapsedTime * tune.treeAnimationSpeed
    group.rotation.z = Math.sin(t * 0.35) * 0.014
    group.rotation.x = Math.sin(t * 0.22) * 0.008
  })

  return (
    <group ref={sway}>
      <primitive object={root} />
    </group>
  )
}

export const HeroTree = () => {
  const { tune } = useHeroTune()
  const groveReady = useGroveGlbStatus()
  const reducedMotion = usePrefersReducedMotion()
  const leaf = useMemo(
    () => hslColor(tune.leafHue, tune.leafSat, tune.leafLit),
    [tune.leafHue, tune.leafLit, tune.leafSat]
  )
  const bark = useMemo(
    () => hslColor(tune.barkHue, tune.barkSat, tune.barkLit),
    [tune.barkHue, tune.barkLit, tune.barkSat]
  )
  const blockout = (
    <TreeBlockout
      reducedMotion={reducedMotion}
      leaf={leaf}
      bark={bark}
      leafRoughness={tune.leafRoughness}
      barkRoughness={tune.barkRoughness}
      animationSpeed={tune.treeAnimationSpeed}
    />
  )

  return (
    <group
      position={[tune.treeX, tune.mediaUnitHeight, tune.treeZ]}
      rotation={[0, tune.treeYaw, 0]}
      scale={tune.treeScale}
    >
      <Planter bark={bark} />
      <group position={[0, PLANTER_SOIL_Y, 0]}>
        {groveReady ? (
          <GroveLoadBoundary fallback={blockout}>
            <Suspense fallback={blockout}>
              <GroveTree reducedMotion={reducedMotion} />
            </Suspense>
          </GroveLoadBoundary>
        ) : (
          blockout
        )}
      </group>
    </group>
  )
}
