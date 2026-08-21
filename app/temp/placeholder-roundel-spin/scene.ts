import {
  AmbientLight,
  Color,
  ColorManagement,
  DirectionalLight,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  OrthographicCamera,
  Scene,
  LatheGeometry,
  SphereGeometry,
  Vector2,
  Vector3,
  type Material,
} from "three"
import {
  unusedAxis,
  type Axis,
  type Pose,
} from "@/lib/temp/placeholder-roundel-spin/animation"
import type { PlaceholderRoundelSpinConfig } from "@/lib/temp/placeholder-roundel-spin/config"
import {
  PLACEHOLDER_ROUNDEL_SVG,
  crescentPoints,
  remainingRingProfile,
} from "@/lib/temp/placeholder-roundel-spin/geometry"

ColorManagement.enabled = false

export const SVG_RENDERER_LIMITS = [
  "SVGRenderer projects triangles with a painter’s algorithm. It does not do smooth PBR shading, textures, or reflections — which is what we want for a graphic/SVG look.",
  "Sphere and ring may intersect at the exact SVG proportions (the bar crosses the disc). Depth-sort artifacts can appear there; tune sphere radius or ring radius if they show.",
  "If the vector frames are not good enough, replace renderSvgFrame only. Do not silently fall back to PNG screenshots.",
].join(" ")

const setAxisAngle = (group: Group, axis: Axis, angle: number) => {
  group.rotation.x = axis === "x" ? angle : 0
  group.rotation.y = axis === "y" ? angle : 0
  group.rotation.z = axis === "z" ? angle : 0
}

const centroid = new Vector3()
const worldCentroid = new Vector3()

/** Camera sits on +Z, so world Z ≥ 0 is the near half of the ring. */
export const partitionRingByViewDepth = (
  mesh: Mesh
): { front: number[]; back: number[] } => {
  const position = mesh.geometry.getAttribute("position")
  const index = mesh.geometry.getIndex()
  const front: number[] = []
  const back: number[] = []
  if (!position) return { front, back }

  mesh.updateWorldMatrix(true, false)
  const matrix = mesh.matrixWorld

  const pushTriangle = (ia: number, ib: number, ic: number) => {
    centroid.set(
      (position.getX(ia) + position.getX(ib) + position.getX(ic)) / 3,
      (position.getY(ia) + position.getY(ib) + position.getY(ic)) / 3,
      (position.getZ(ia) + position.getZ(ib) + position.getZ(ic)) / 3
    )
    worldCentroid.copy(centroid).applyMatrix4(matrix)
    if (worldCentroid.z >= 0) front.push(ia, ib, ic)
    else back.push(ia, ib, ic)
  }

  if (index) {
    for (let i = 0; i < index.count; i += 3) {
      pushTriangle(index.getX(i), index.getX(i + 1), index.getX(i + 2))
    }
  } else {
    for (let i = 0; i < position.count; i += 3) {
      pushTriangle(i, i + 1, i + 2)
    }
  }
  return { front, back }
}

type GraphicMaterial = MeshBasicMaterial | MeshLambertMaterial

export type RoundelSpinLayer =
  | "sphere"
  | "ring"
  | "ring-back"
  | "ring-front"
  | "both"

export type RoundelSpinWorld = {
  scene: Scene
  camera: OrthographicCamera
  applyConfig: (config: PlaceholderRoundelSpinConfig) => void
  applyPose: (pose: Pose, config: PlaceholderRoundelSpinConfig) => void
  setLayerVisibility: (layer: RoundelSpinLayer) => void
  dispose: () => void
}

const frustumFor = (config: PlaceholderRoundelSpinConfig) => {
  const viewWidth = PLACEHOLDER_ROUNDEL_SVG.viewWidth
  const viewHeight =
    config.frameFit === "square"
      ? PLACEHOLDER_ROUNDEL_SVG.viewWidth
      : PLACEHOLDER_ROUNDEL_SVG.viewHeight
  const scale = Math.max(config.cameraScale, 0.05)
  return {
    halfWidth: viewWidth / 2 / scale,
    halfHeight: viewHeight / 2 / scale,
  }
}

const createMaterial = (
  color: string,
  kind: PlaceholderRoundelSpinConfig["material"]
): GraphicMaterial =>
  kind === "lambert"
    ? new MeshLambertMaterial({
        color,
        flatShading: true,
      })
    : new MeshBasicMaterial({ color })

const disposeMaterial = (material: Material | Material[]) => {
  if (Array.isArray(material)) {
    for (const entry of material) entry.dispose()
    return
  }
  material.dispose()
}

export const createRoundelSpinWorld = (
  config: PlaceholderRoundelSpinConfig
): RoundelSpinWorld => {
  const scene = new Scene()
  scene.background = new Color(0xffffff)

  const camera = new OrthographicCamera(-1, 1, 1, -1, -4000, 4000)
  camera.position.set(0, 0, 1200)
  camera.lookAt(0, 0, 0)

  const spinGroup = new Group()
  const tiltGroup = new Group()
  spinGroup.add(tiltGroup)
  scene.add(spinGroup)

  const ambient = new AmbientLight(0xffffff, 0.7)
  const key = new DirectionalLight(0xffffff, 0.55)
  key.position.set(-0.35, 0.8, 1)
  scene.add(ambient, key)

  let sphere: Mesh | null = null
  let ring: Mesh | null = null
  let ringIndex: number[] | null = null

  const restoreRingIndex = () => {
    if (ring && ringIndex) ring.geometry.setIndex(ringIndex)
  }

  const clearMeshes = () => {
    if (sphere) {
      tiltGroup.remove(sphere)
      sphere.geometry.dispose()
      disposeMaterial(sphere.material)
      sphere = null
    }
    if (ring) {
      restoreRingIndex()
      tiltGroup.remove(ring)
      ring.geometry.dispose()
      disposeMaterial(ring.material)
      ring = null
      ringIndex = null
    }
  }

  const applyConfig = (next: PlaceholderRoundelSpinConfig) => {
    clearMeshes()
    scene.background = new Color(0xffffff)

    const sphereMaterial = createMaterial(next.sphereColor, next.material)
    const ringMaterial = createMaterial(next.ringColor, next.material)

    sphere = new Mesh(
      new SphereGeometry(
        next.sphereRadius,
        next.sphereWidthSegments,
        next.sphereHeightSegments
      ),
      sphereMaterial
    )
    ring = new Mesh(
      new LatheGeometry(
        crescentPoints(
          remainingRingProfile(
            next.ringRadius,
            next.ringThickness,
            next.sphereRadius,
            next.ringRadialSegments
          )
        ).map((point) => new Vector2(point.x, point.y)),
        next.ringTubularSegments
      ),
      ringMaterial
    )
    const index = ring.geometry.getIndex()
    ringIndex = index ? Array.from(index.array) : null

    tiltGroup.add(sphere, ring)

    const { halfWidth, halfHeight } = frustumFor(next)
    camera.left = -halfWidth
    camera.right = halfWidth
    camera.top = halfHeight
    camera.bottom = -halfHeight
    camera.updateProjectionMatrix()
  }

  const applyPose = (pose: Pose, next: PlaceholderRoundelSpinConfig) => {
    setAxisAngle(spinGroup, next.spinAxis, pose.spin)
    tiltGroup.rotation.set(0, 0, 0)
    tiltGroup.rotation[next.tiltAxis] = pose.tilt
    tiltGroup.rotation[unusedAxis(next.spinAxis, next.tiltAxis)] = pose.wobble
  }

  const setLayerVisibility = (layer: RoundelSpinLayer) => {
    restoreRingIndex()
    if (sphere) {
      sphere.visible = layer === "sphere" || layer === "both"
    }
    if (!ring) return
    if (layer === "ring" || layer === "both") {
      ring.visible = true
      return
    }
    if (layer === "ring-front" || layer === "ring-back") {
      const { front, back } = partitionRingByViewDepth(ring)
      const faces = layer === "ring-front" ? front : back
      ring.visible = faces.length > 0
      if (faces.length > 0) ring.geometry.setIndex(faces)
      return
    }
    ring.visible = false
  }

  applyConfig(config)

  return {
    scene,
    camera,
    applyConfig,
    applyPose,
    setLayerVisibility,
    dispose: () => {
      clearMeshes()
    },
  }
}
