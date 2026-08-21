"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { PlaceholderRoundelSvg } from "@/components/tfl/brand/tfl-roundel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import {
  atlasLayout,
  buildZipArchive,
  composeSvgAtlas,
  DEFAULT_PLACEHOLDER_ROUNDEL_SPIN_CONFIG,
  describeAtlas,
  encodeUtf8,
  frameFileName,
  frameIndexForTime,
  sampleTimes,
  renderSvgClips,
  spriteMeta,
  totalClipFrames,
  type PlaceholderRoundelSpinConfig,
} from "@/lib/temp/placeholder-roundel-spin"
import { cn } from "@/lib/utils"
import { SpritePlayback } from "./sprite-playback"
import { SVG_RENDERER_LIMITS } from "./svg-export"
import { useClipPlayback } from "./use-clip-playback"
import { WebGLPreview } from "./webgl-preview"

const AXIS_MARK: Record<"x" | "y" | "z", string> = {
  x: "←→",
  y: "^",
  z: "(•)",
}

const downloadBlob = (blob: Blob, name: string) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = name
  link.click()
  URL.revokeObjectURL(url)
}

export const PlaceholderRoundelSpinLab = () => {
  const [config, setConfig] = useState(DEFAULT_PLACEHOLDER_ROUNDEL_SPIN_CONFIG)
  const [loop, setLoop] = useState(false)
  const [frames, setFrames] = useState<string[] | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)
  const [spritePlaying, setSpritePlaying] = useState(false)
  const [spriteMode, setSpriteMode] = useState<"intro" | "hover">("intro")
  const playback = useClipPlayback(config, loop)
  const configRef = useRef(config)
  const configKey = JSON.stringify(config)
  const [sampledKey, setSampledKey] = useState<string | null>(null)
  const generating = sampledKey !== configKey

  const pose = playback.pose
  const t = playback.t
  const currentFrame = frameIndexForTime(t, config.frameCount)
  const layout = atlasLayout({
    ...config,
    frameCount: frames?.length ?? totalClipFrames(config),
  })
  const atlasSvg = useMemo(
    () =>
      frames
        ? composeSvgAtlas(frames, { ...config, frameCount: frames.length })
        : null,
    [frames, config]
  )

  const handlePatch = <K extends keyof PlaceholderRoundelSpinConfig>(
    key: K,
    value: PlaceholderRoundelSpinConfig[K]
  ) => {
    setConfig((current) => ({ ...current, [key]: value }))
  }

  const handleReset = () => {
    setConfig(DEFAULT_PLACEHOLDER_ROUNDEL_SPIN_CONFIG)
    playback.playIntro()
    setSpriteMode("intro")
    setSpritePlaying(false)
  }

  const handlePlay = (mode: "intro" | "hover") => {
    setSpriteMode(mode)
    setSpritePlaying(true)
    if (mode === "intro") playback.playIntro()
    else playback.playHover()
  }

  const handlePause = () => {
    playback.pause()
    setSpritePlaying(false)
  }

  const handleRestart = () => {
    setSpriteMode("intro")
    setSpritePlaying(true)
    playback.playIntro()
  }

  useEffect(() => {
    configRef.current = config
  }, [config])

  useEffect(() => {
    let cancelled = false
    const handle = window.setTimeout(() => {
      const result = renderSvgClips(config)
      if (cancelled) return
      if (result.ok) {
        setFrames(result.frames)
        setExportError(null)
      } else {
        setFrames(null)
        setExportError(result.error)
      }
      setSampledKey(configKey)
    }, 180)
    return () => {
      cancelled = true
      window.clearTimeout(handle)
    }
  }, [config, configKey])

  const handleDownloadZip = () => {
    if (!frames || !atlasSvg) return
    const meta = spriteMeta(config)
    const files = [
      ...frames.map((svg, index) => ({
        name: frameFileName(index),
        data: encodeUtf8(svg),
      })),
      { name: "atlas.svg", data: encodeUtf8(atlasSvg) },
      {
        name: "metadata.json",
        data: encodeUtf8(`${JSON.stringify(meta, null, 2)}\n`),
      },
    ]
    const zip = buildZipArchive(files)
    const zipBuffer = zip.buffer.slice(
      zip.byteOffset,
      zip.byteOffset + zip.byteLength
    )
    downloadBlob(
      new Blob([zipBuffer as ArrayBuffer], { type: "application/zip" }),
      "placeholder-roundel-spin.zip"
    )
  }

  const handleSaveDirectory = async () => {
    if (!frames || !atlasSvg) return
    const picker = (
      window as Window & {
        showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>
      }
    ).showDirectoryPicker
    if (!picker) return
    const root = await picker()
    const write = async (name: string, contents: string) => {
      const file = await root.getFileHandle(name, { create: true })
      const writable = await file.createWritable()
      await writable.write(contents)
      await writable.close()
    }
    for (const [index, svg] of frames.entries()) {
      await write(frameFileName(index), svg)
    }
    await write("atlas.svg", atlasSvg)
    await write(
      "metadata.json",
      `${JSON.stringify(spriteMeta(config), null, 2)}\n`
    )
  }

  const handleCopyConfig = async () => {
    await navigator.clipboard.writeText(`${JSON.stringify(config, null, 2)}\n`)
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <header className="space-y-2">
        <p className="text-xs tracking-wide text-muted-foreground uppercase">
          Temp lab
        </p>
        <h1 className="text-2xl font-medium tracking-tight">
          Placeholder roundel spin
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          The mock header is live Three.js and follows these sliders. Play
          buttons step the baked sprite. Rebuild the header atlas with{" "}
          <code className="text-foreground">pnpm roundel-spin:build</code>.
        </p>
      </header>

      <section className="space-y-3">
        <div
          className="flex h-(--site-header-height) items-center gap-2 border border-border bg-background/60 px-4"
          onPointerEnter={playback.handlePointerEnter}
          onPointerLeave={playback.handlePointerLeave}
        >
          <WebGLPreview
            config={config}
            pose={playback.pose}
            className="size-5 shrink-0"
          />
          <span className="truncate text-sm font-medium tracking-tight text-foreground">
            tfl-components
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Hover the bar, or use Play intro / Play hover. Accel, cruise, and
          decel are slices of the default animation — hover cruise is the
          peak-speed central turn.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <PlaceholderRoundelSvg
              framed={false}
              className="size-5 shrink-0 text-muted-foreground"
            />
            <span className="text-xs text-muted-foreground">
              Flat SVG at rest
            </span>
          </div>
          <p className="text-xs text-muted-foreground tabular-nums">
            spin {(pose.spin / (Math.PI * 2)).toFixed(3)} turns · tilt{" "}
            {((pose.tilt * 180) / Math.PI).toFixed(1)}° · axis{" "}
            {AXIS_MARK[config.spinAxis]}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={() => handlePlay("intro")}
            aria-label="Play intro"
          >
            Play intro
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handlePlay("hover")}
            aria-label="Play hover"
          >
            Play hover
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handlePause}
            aria-label="Pause"
          >
            Pause
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleRestart}
            aria-label="Restart"
          >
            Restart
          </Button>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={loop}
              onChange={(event) => setLoop(event.target.checked)}
            />
            Loop
          </label>
          <Button size="sm" variant="outline" onClick={handleReset}>
            Reset SVG defaults
          </Button>
          <Button size="sm" variant="outline" onClick={handleCopyConfig}>
            Copy config
          </Button>
          <p className="ml-auto text-xs text-muted-foreground tabular-nums">
            t={t.toFixed(3)} · frame {currentFrame} / {layout.frameCount - 1}
          </p>
        </div>
        <div className="space-y-1">
          <Label htmlFor="timeline">Timeline</Label>
          <Slider
            id="timeline"
            min={0}
            max={1}
            step={0.001}
            value={[t]}
            onValueChange={(value) => {
              const next = Array.isArray(value) ? value[0] : value
              if (typeof next !== "number") return
              setSpritePlaying(false)
              playback.scrub(next)
            }}
            aria-label="Normalised animation time"
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium">Controls</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <NumberControl
            id="turns"
            label="Turns"
            value={config.turns}
            min={3}
            max={8}
            step={1}
            onChange={(value) => handlePatch("turns", value)}
          />
          <NumberControl
            id="duration"
            label="Duration (ms)"
            value={config.durationMs}
            min={400}
            max={8000}
            step={50}
            onChange={(value) => handlePatch("durationMs", value)}
          />
          <NumberControl
            id="max-tilt"
            label="Max tilt (°)"
            value={config.maxTiltDeg}
            min={0}
            max={80}
            step={1}
            onChange={(value) => handlePatch("maxTiltDeg", value)}
          />
          <SelectControl
            id="spin-axis"
            label="Spin axis"
            value={config.spinAxis}
            options={[
              { value: "y", label: "^  Y (vertical)" },
              { value: "z", label: "(•)  Z (view)" },
              { value: "x", label: "←→  X" },
            ]}
            onChange={(value) => {
              if (value === "x" || value === "y" || value === "z") {
                handlePatch("spinAxis", value)
              }
            }}
          />
          <SelectControl
            id="tilt-axis"
            label="Tilt axis"
            value={config.tiltAxis}
            options={[
              { value: "x", label: "←→  X" },
              { value: "y", label: "^  Y (vertical)" },
              { value: "z", label: "(•)  Z (view)" },
            ]}
            onChange={(value) => {
              if (value === "x" || value === "y" || value === "z") {
                handlePatch("tiltAxis", value)
              }
            }}
          />
          <SelectControl
            id="spin-profile"
            label="Spin profile"
            value={config.spinProfile}
            options={[
              { value: "smootherstep", label: "Smootherstep" },
              { value: "accel-cruise-decel", label: "Accel → cruise → decel" },
            ]}
            onChange={(value) => {
              if (value === "smootherstep" || value === "accel-cruise-decel") {
                handlePatch("spinProfile", value)
              }
            }}
          />
          <NumberControl
            id="accel"
            label="Accel fraction"
            value={config.accelFraction}
            min={0.05}
            max={0.45}
            step={0.01}
            onChange={(value) => handlePatch("accelFraction", value)}
          />
          <NumberControl
            id="wobble"
            label="Wobble (°)"
            value={config.wobbleAmpDeg}
            min={0}
            max={12}
            step={0.5}
            onChange={(value) => handlePatch("wobbleAmpDeg", value)}
          />
          <NumberControl
            id="sphere-r"
            label="Sphere radius"
            value={config.sphereRadius}
            min={160}
            max={280}
            step={1}
            onChange={(value) => handlePatch("sphereRadius", value)}
          />
          <NumberControl
            id="ring-r"
            label="Ring radius"
            value={config.ringRadius}
            min={180}
            max={360}
            step={1}
            onChange={(value) => handlePatch("ringRadius", value)}
          />
          <NumberControl
            id="ring-t"
            label="Ring thickness"
            value={config.ringThickness}
            min={20}
            max={90}
            step={0.5}
            onChange={(value) => handlePatch("ringThickness", value)}
          />
          <NumberControl
            id="camera"
            label="Camera scale"
            value={config.cameraScale}
            min={0.5}
            max={2.5}
            step={0.05}
            onChange={(value) => handlePatch("cameraScale", value)}
          />
          <NumberControl
            id="preview-speed"
            label="Preview speed"
            value={config.previewSpeed}
            min={0.25}
            max={3}
            step={0.05}
            onChange={(value) => handlePatch("previewSpeed", value)}
          />
          <NumberControl
            id="frames"
            label="Frame count"
            value={config.frameCount}
            min={4}
            max={96}
            step={1}
            onChange={(value) => handlePatch("frameCount", Math.round(value))}
          />
          <NumberControl
            id="rows"
            label="Sprite rows"
            value={config.spriteRows}
            min={1}
            max={12}
            step={1}
            onChange={(value) => handlePatch("spriteRows", Math.round(value))}
          />
          <NumberControl
            id="frame-w"
            label="Frame width"
            value={config.frameWidth}
            min={32}
            max={256}
            step={2}
            onChange={(value) => handlePatch("frameWidth", Math.round(value))}
          />
          <NumberControl
            id="frame-h"
            label="Frame height"
            value={config.frameHeight}
            min={32}
            max={256}
            step={2}
            onChange={(value) => handlePatch("frameHeight", Math.round(value))}
          />
          <NumberControl
            id="svg-export-size"
            label="SVG frame (units)"
            value={config.svgExportSize}
            min={100}
            max={400}
            step={20}
            onChange={(value) => handlePatch("svgExportSize", Math.round(value))}
          />
          <SelectControl
            id="frame-fit"
            label="Frame fit"
            value={config.frameFit}
            options={[
              { value: "square", label: "Square (header / icon)" },
              { value: "svg", label: "SVG 615.3×500" },
            ]}
            onChange={(value) => {
              if (value === "square" || value === "svg") {
                handlePatch("frameFit", value)
              }
            }}
          />
          <SelectControl
            id="material"
            label="Material"
            value={config.material}
            options={[
              { value: "basic", label: "Flat (MeshBasic)" },
              { value: "lambert", label: "Graphic Lambert" },
            ]}
            onChange={(value) => {
              if (value === "basic" || value === "lambert") {
                handlePatch("material", value)
              }
            }}
          />
          <ColorControl
            id="sphere-color"
            label="Sphere colour"
            value={config.sphereColor}
            onChange={(value) => handlePatch("sphereColor", value)}
          />
          <ColorControl
            id="ring-color"
            label="Ring colour"
            value={config.ringColor}
            onChange={(value) => handlePatch("ringColor", value)}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">SVG export</h2>
        <p className="text-xs text-muted-foreground">{SVG_RENDERER_LIMITS}</p>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={handleDownloadZip}
            disabled={!frames}
            aria-label="Download SVG frames zip"
          >
            Download frames + atlas
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              void handleSaveDirectory()
            }}
            disabled={!frames}
          >
            Save to folder
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Each frame is torus minus sphere, sliced on the view plane, flattened,
          then a 2D circle.
          Rebuild the site header with{" "}
          <code className="text-foreground">pnpm roundel-spin:build</code>.
        </p>
        {generating ? (
          <p className="text-xs text-muted-foreground">Sampling SVG frames…</p>
        ) : null}
        {exportError ? (
          <p className="text-xs text-destructive">{exportError}</p>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Frame strip</h2>
        <p className="text-xs text-muted-foreground tabular-nums">
          {layout.frameCount} frames · {layout.frameWidth}×{layout.frameHeight}{" "}
          · t = i / ({layout.frameCount} − 1)
        </p>
        {frames ? (
          <div className="flex flex-wrap gap-1">
            {frames.map((svg, index) => (
              <button
                key={index}
                type="button"
                className={cn(
                  "bg-white p-0",
                  index === currentFrame && "ring-2 ring-ring"
                )}
                aria-label={`Scrub to frame ${index}`}
                onClick={() => {
                  setSpritePlaying(false)
                  playback.scrub(sampleTimes(config.frameCount)[index] ?? 0)
                }}
              >
                <div
                  className="size-12 bg-white [&_svg]:block [&_svg]:size-full"
                  dangerouslySetInnerHTML={{ __html: svg }}
                />
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            No SVG frames yet. If this persists, SVGRenderer could not render
            the scene — see the export note above.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Sprite atlas</h2>
        <p className="text-xs text-muted-foreground tabular-nums">
          {describeAtlas(layout)}
        </p>
        {atlasSvg ? (
          <div className="overflow-auto bg-white p-2">
            <div
              role="img"
              aria-label="Composed SVG sprite atlas"
              className="max-w-full bg-white [&_svg]:block [&_svg]:h-auto [&_svg]:max-w-full"
              dangerouslySetInnerHTML={{ __html: atlasSvg }}
            />
          </div>
        ) : null}
      </section>

      <section className="space-y-3 border-t border-border pt-6">
        <h2 className="text-sm font-medium">Sprite playback (no Three.js)</h2>
        <p className="text-xs text-muted-foreground">
          Proof that the generated atlas can be stepped with ordinary SVG
          viewBox animation. This is the intended header path.
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setSpritePlaying((current) => !current)}
          disabled={!atlasSvg}
        >
          {spritePlaying ? "Stop sprite" : "Play sprite"}
        </Button>
        {atlasSvg ? (
          <SpritePlayback
            atlasSvg={atlasSvg}
            config={config}
            playing={spritePlaying}
            mode={spriteMode}
          />
        ) : null}
      </section>
    </div>
  )
}

const NumberControl = ({
  id,
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  id: string
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
}) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between gap-2">
      <Label htmlFor={id}>{label}</Label>
      <span className="text-xs text-muted-foreground tabular-nums">
        {Number(value.toFixed(step >= 1 ? 0 : 2))}
      </span>
    </div>
    <Slider
      id={id}
      min={min}
      max={max}
      step={step}
      value={[value]}
      onValueChange={(next) => {
        const resolved = Array.isArray(next) ? next[0] : next
        if (typeof resolved === "number") onChange(resolved)
      }}
      aria-label={label}
    />
  </div>
)

const SelectControl = ({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}) => (
  <div className="space-y-2">
    <Label htmlFor={id}>{label}</Label>
    <Select
      value={value}
      onValueChange={(next) => {
        if (next) onChange(next)
      }}
    >
      <SelectTrigger id={id} size="sm" aria-label={label} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
)

const ColorControl = ({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
}) => (
  <div className="space-y-2">
    <Label htmlFor={id}>{label}</Label>
    <div className="flex items-center gap-2">
      <input
        id={id}
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="size-8 cursor-pointer border border-border bg-background"
        aria-label={label}
      />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={`${label} hex`}
      />
    </div>
  </div>
)
