"use client"

import { useEffect, useMemo, useState } from "react"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { lerpCamera, type Vec3 } from "@/components/drafts/hero-3d/composition"
import { useHeroTune } from "@/components/drafts/hero-3d/hero-tune-context"

const RangeField = ({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
}) => (
  <div className="grid grid-cols-[1fr_auto] gap-x-2 gap-y-1">
    <Label className="text-[11px] font-normal text-white/80">{label}</Label>
    <span className="text-[10px] text-white/60 tabular-nums">
      {value.toFixed(2)}
    </span>
    <Slider
      className="col-span-2"
      min={min}
      max={max}
      step={step}
      value={[value]}
      onValueChange={(next) => {
        const numeric = Array.isArray(next) ? next[0] : next
        if (typeof numeric === "number") onChange(numeric)
      }}
    />
  </div>
)

export const DebugPanel = () => {
  const { tune, setTune, resetTune } = useHeroTune()
  const [viewport, setViewport] = useState({ width: 1280, height: 800 })

  useEffect(() => {
    const handleResize = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight })
    }
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const framed = useMemo(
    () =>
      lerpCamera(viewport.width, viewport.width / Math.max(viewport.height, 1)),
    [viewport.height, viewport.width]
  )

  const camera = tune.followViewport
    ? framed
    : {
        position: tune.cameraPosition,
        target: tune.cameraTarget,
        fov: tune.fov,
      }

  const unlockCamera = (patch: {
    cameraPosition?: Vec3
    cameraTarget?: Vec3
    fov?: number
  }) => {
    setTune({
      followViewport: false,
      cameraPosition: patch.cameraPosition ?? camera.position,
      cameraTarget: patch.cameraTarget ?? camera.target,
      fov: patch.fov ?? camera.fov,
    })
  }

  return (
    <aside
      className="pointer-events-auto absolute bottom-3 left-3 z-20 max-h-[min(70dvh,32rem)] w-64 overflow-y-auto rounded-md border border-white/15 bg-black/70 p-3 text-white shadow-lg backdrop-blur-sm"
      aria-label="Hero composition tuning"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs font-medium tracking-wide uppercase">Tune</p>
        <button
          type="button"
          className="text-[11px] text-white/70 underline-offset-2 hover:text-white hover:underline"
          onClick={resetTune}
        >
          Reset
        </button>
      </div>
      <p className="mb-3 text-[10px] leading-snug text-white/55">
        {tune.followViewport
          ? "Camera follows viewport crop."
          : "Camera unlocked from viewport."}{" "}
        {viewport.width}×{viewport.height}
      </p>
      <div className="space-y-3">
        <RangeField
          label="Camera X"
          value={camera.position[0]}
          min={-1.5}
          max={1.5}
          step={0.01}
          onChange={(value) =>
            unlockCamera({
              cameraPosition: [value, camera.position[1], camera.position[2]],
            })
          }
        />
        <RangeField
          label="Camera Y"
          value={camera.position[1]}
          min={0.4}
          max={2.6}
          step={0.01}
          onChange={(value) =>
            unlockCamera({
              cameraPosition: [camera.position[0], value, camera.position[2]],
            })
          }
        />
        <RangeField
          label="Camera Z"
          value={camera.position[2]}
          min={0.8}
          max={5.5}
          step={0.01}
          onChange={(value) =>
            unlockCamera({
              cameraPosition: [camera.position[0], camera.position[1], value],
            })
          }
        />
        <RangeField
          label="Target X"
          value={camera.target[0]}
          min={-1.4}
          max={1.4}
          step={0.01}
          onChange={(value) =>
            unlockCamera({
              cameraTarget: [value, camera.target[1], camera.target[2]],
            })
          }
        />
        <RangeField
          label="Target Y"
          value={camera.target[1]}
          min={0.4}
          max={2.4}
          step={0.01}
          onChange={(value) =>
            unlockCamera({
              cameraTarget: [camera.target[0], value, camera.target[2]],
            })
          }
        />
        <RangeField
          label="Target Z"
          value={camera.target[2]}
          min={-1}
          max={1.2}
          step={0.01}
          onChange={(value) =>
            unlockCamera({
              cameraTarget: [camera.target[0], camera.target[1], value],
            })
          }
        />
        <RangeField
          label="FOV"
          value={camera.fov}
          min={22}
          max={55}
          step={0.5}
          onChange={(value) => unlockCamera({ fov: value })}
        />
        <RangeField
          label="Sun azimuth"
          value={tune.sunAzimuth}
          min={-80}
          max={20}
          step={0.5}
          onChange={(sunAzimuth) => setTune({ sunAzimuth })}
        />
        <RangeField
          label="Sun elevation"
          value={tune.sunElevation}
          min={18}
          max={70}
          step={0.5}
          onChange={(sunElevation) => setTune({ sunElevation })}
        />
        <RangeField
          label="Display X"
          value={tune.displayX}
          min={-1.2}
          max={0.8}
          step={0.01}
          onChange={(displayX) => setTune({ displayX })}
        />
        <RangeField
          label="Display Y"
          value={tune.displayY}
          min={0.9}
          max={2.1}
          step={0.01}
          onChange={(displayY) => setTune({ displayY })}
        />
        <RangeField
          label="Media-unit height"
          value={tune.mediaUnitHeight}
          min={0.32}
          max={0.7}
          step={0.005}
          onChange={(mediaUnitHeight) => setTune({ mediaUnitHeight })}
        />
        <p className="pt-1 text-[10px] font-medium tracking-wide text-white/50 uppercase">
          Tree
        </p>
        <p className="text-[10px] leading-snug text-white/50">
          Blockout until you drop a Grove export at{" "}
          <span className="text-white/70">public/drafts/hero-3d/tree.glb</span>.
          Raise lightness / drop saturation to show baked textures.
        </p>
        <RangeField
          label="Tree X"
          value={tune.treeX}
          min={-1.6}
          max={0.2}
          step={0.01}
          onChange={(treeX) => setTune({ treeX })}
        />
        <RangeField
          label="Tree Z"
          value={tune.treeZ}
          min={0.12}
          max={0.7}
          step={0.01}
          onChange={(treeZ) => setTune({ treeZ })}
        />
        <RangeField
          label="Tree yaw"
          value={tune.treeYaw}
          min={-Math.PI}
          max={Math.PI}
          step={0.01}
          onChange={(treeYaw) => setTune({ treeYaw })}
        />
        <RangeField
          label="Tree scale"
          value={tune.treeScale}
          min={0.4}
          max={2.4}
          step={0.01}
          onChange={(treeScale) => setTune({ treeScale })}
        />
        <RangeField
          label="Bark hue"
          value={tune.barkHue}
          min={0}
          max={360}
          step={1}
          onChange={(barkHue) => setTune({ barkHue })}
        />
        <RangeField
          label="Bark sat"
          value={tune.barkSat}
          min={0}
          max={1}
          step={0.01}
          onChange={(barkSat) => setTune({ barkSat })}
        />
        <RangeField
          label="Bark light"
          value={tune.barkLit}
          min={0.05}
          max={0.85}
          step={0.01}
          onChange={(barkLit) => setTune({ barkLit })}
        />
        <RangeField
          label="Bark roughness"
          value={tune.barkRoughness}
          min={0.15}
          max={1}
          step={0.01}
          onChange={(barkRoughness) => setTune({ barkRoughness })}
        />
        <RangeField
          label="Leaf hue"
          value={tune.leafHue}
          min={0}
          max={360}
          step={1}
          onChange={(leafHue) => setTune({ leafHue })}
        />
        <RangeField
          label="Leaf sat"
          value={tune.leafSat}
          min={0}
          max={1}
          step={0.01}
          onChange={(leafSat) => setTune({ leafSat })}
        />
        <RangeField
          label="Leaf light"
          value={tune.leafLit}
          min={0.08}
          max={0.85}
          step={0.01}
          onChange={(leafLit) => setTune({ leafLit })}
        />
        <RangeField
          label="Leaf roughness"
          value={tune.leafRoughness}
          min={0.15}
          max={1}
          step={0.01}
          onChange={(leafRoughness) => setTune({ leafRoughness })}
        />
        <RangeField
          label="Leaf shadow clip"
          value={tune.leafAlphaTest}
          min={0.1}
          max={0.8}
          step={0.01}
          onChange={(leafAlphaTest) => setTune({ leafAlphaTest })}
        />
        <RangeField
          label="Sway speed"
          value={tune.treeAnimationSpeed}
          min={0}
          max={2}
          step={0.05}
          onChange={(treeAnimationSpeed) => setTune({ treeAnimationSpeed })}
        />
      </div>
    </aside>
  )
}
