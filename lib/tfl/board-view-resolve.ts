/**
 * Renderer readiness for `/board/view`.
 * Pure: no React / browser storage. The paste parser never sends the string
 * anywhere — it only inspects a URL the visitor already has.
 */

import { resolveBoardSlots } from "@/lib/tfl/board-panels"
import {
  BOARD_VIEW_PATH,
  DEFAULT_BOARD_CONFIG,
  parseBoardConfig,
  type BoardConfig,
} from "@/lib/tfl/board-url-state"
import { HOME_RAIL_STOP } from "@/lib/tfl/home-arrivals-stops"

export type BoardReadiness = {
  usableConfig: boolean
  hasKey: boolean
  ready: boolean
}

export type ResolveBoardReadinessOptions = {
  /**
   * Landing / preview iframes can poll allowlisted demo stops via the site
   * key. The hosted `/board/view` page still needs a visitor key.
   */
  allowSiteDemo?: boolean
}

/** Oxford Circus rail + status — default preview when the hash is empty. */
export const DEMO_BOARD_CONFIG: BoardConfig = {
  ...DEFAULT_BOARD_CONFIG,
  stop: HOME_RAIL_STOP.id,
  stopName: HOME_RAIL_STOP.name,
}

export type BoardViewLinkParseResult =
  | { ok: true; config: BoardConfig; key: string }
  | { ok: false; error: string }

const BOARD_LINK_EMPTY = "Paste the complete Board link."
const BOARD_LINK_INVALID = "This is not a Board link."
const BOARD_LINK_INCOMPLETE =
  "This link is missing the Board setup or TfL API key."

const panelHasRequiredTarget = (
  kind: "rail" | "bus" | "river" | "cycle",
  config: BoardConfig
): boolean => {
  if (kind === "rail") return Boolean(config.stop?.trim())
  if (kind === "bus") return Boolean(config.bus.stop?.trim())
  if (kind === "river") return Boolean(config.river.stop?.trim())
  return (config.cycle.docks?.length ?? 0) > 0
}

/** A layout that can render without a per-panel missing-state cascade. */
export const isUsableBoardConfig = (config: BoardConfig): boolean => {
  const slots = resolveBoardSlots(config.slots.p1, config.slots.p2)
  const kinds = new Set([...slots.p1, ...slots.p2])
  if (kinds.size === 0) return false
  const nonStatusKinds = [...kinds].filter((kind) => kind !== "status")
  if (nonStatusKinds.length === 0) return true
  return nonStatusKinds.every((kind) => panelHasRequiredTarget(kind, config))
}

export const resolveBoardReadiness = (
  config: BoardConfig,
  storedKey: string | null,
  options?: ResolveBoardReadinessOptions
): BoardReadiness => {
  const usableConfig = isUsableBoardConfig(config)
  const hasKey = Boolean(config.key?.trim() || storedKey?.trim())
  const ready = usableConfig && (hasKey || Boolean(options?.allowSiteDemo))
  return { usableConfig, hasKey, ready }
}

export const isBoardReady = (
  config: BoardConfig,
  storedKey: string | null,
  options?: ResolveBoardReadinessOptions
): boolean => resolveBoardReadiness(config, storedKey, options).ready

/** Previews with no usable hash still show the Oxford Circus demo board. */
export const withDemoBoardFallback = (config: BoardConfig): BoardConfig =>
  isUsableBoardConfig(config) ? config : DEMO_BOARD_CONFIG

const boardViewPathname = (pathname: string): boolean => {
  if (pathname === BOARD_VIEW_PATH) return true
  return pathname === `${BOARD_VIEW_PATH}/`
}

/**
 * Parse a pasted portable Board URL. The key must be in the link itself —
 * a stored credential must not rescue a keyless paste.
 */
export const parseBoardViewLink = (
  raw: string,
  origin: string = typeof window !== "undefined" ? window.location.origin : ""
): BoardViewLinkParseResult => {
  const trimmed = raw.trim()
  if (!trimmed) return { ok: false, error: BOARD_LINK_EMPTY }

  let url: URL
  try {
    url = new URL(trimmed, origin || "https://tfl.manglekuo.com")
  } catch {
    return { ok: false, error: BOARD_LINK_INVALID }
  }
  if (!boardViewPathname(url.pathname)) {
    return { ok: false, error: BOARD_LINK_INVALID }
  }

  const config = parseBoardConfig(url.hash)
  const key = config.key?.trim()
  if (!key || !isUsableBoardConfig(config)) {
    return { ok: false, error: BOARD_LINK_INCOMPLETE }
  }
  return { ok: true, config, key }
}
