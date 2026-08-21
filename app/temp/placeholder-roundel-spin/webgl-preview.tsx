"use client"

import { useEffect, useRef } from "react"
import { WebGLRenderer } from "three"
import type {
  PlaceholderRoundelSpinConfig,
  Pose,
} from "@/lib/temp/placeholder-roundel-spin"
import { createRoundelSpinWorld, type RoundelSpinWorld } from "./scene"

type WebGLPreviewProps = {
  config: PlaceholderRoundelSpinConfig
  pose: Pose
  className?: string
}

export const WebGLPreview = ({ config, pose, className }: WebGLPreviewProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const worldRef = useRef<RoundelSpinWorld | null>(null)
  const rendererRef = useRef<WebGLRenderer | null>(null)
  const configRef = useRef(config)
  const poseRef = useRef(pose)

  useEffect(() => {
    configRef.current = config
  }, [config])

  useEffect(() => {
    poseRef.current = pose
  }, [pose])

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const world = createRoundelSpinWorld(configRef.current)
    const renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
    })
    renderer.setClearColor(0xffffff, 1)
    worldRef.current = world
    rendererRef.current = renderer

    const render = () => {
      const nextConfig = configRef.current
      const width = container.clientWidth
      const height = container.clientHeight
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 3))
      renderer.setSize(width, height, false)
      world.applyPose(poseRef.current, nextConfig)
      renderer.render(world.scene, world.camera)
    }

    render()
    const observer = new ResizeObserver(render)
    observer.observe(container)

    return () => {
      observer.disconnect()
      renderer.dispose()
      world.dispose()
      worldRef.current = null
      rendererRef.current = null
    }
  }, [])

  useEffect(() => {
    worldRef.current?.applyConfig(config)
  }, [config])

  useEffect(() => {
    const world = worldRef.current
    const renderer = rendererRef.current
    if (!world || !renderer) return
    world.applyPose(pose, config)
    renderer.render(world.scene, world.camera)
  }, [config, pose])

  return (
    <div ref={containerRef} className={className}>
      <canvas
        ref={canvasRef}
        className="block size-full"
        aria-label="Animated placeholder roundel preview"
      />
    </div>
  )
}
