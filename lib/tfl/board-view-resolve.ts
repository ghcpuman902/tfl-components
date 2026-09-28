/**
 * Renderer readiness for `/board/view`.
 * A usable layout is enough: the hosted board fetches with the project key.
 * A visitor key in the hash is optional (legacy links) and is never required.
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

/** Oxford Circus rail + status — default preview when the hash is empty. */
export const DEMO_BOARD_CONFIG: BoardConfig = {
  ...DEFAULT_BOARD_CONFIG,
  stop: HOME_RAIL_STOP.id,
  stopName: HOME_RAIL_STOP.name,
}

export type BoardViewLinkParseResult =
  | { ok: true; config: BoardConfig; key: string | null }
  | { ok: false; error: string }

const BOARD_LINK_EMPTY = "Paste the complete Board link."
const BOARD_LINK_INVALID = "This is not a Board link."
const BOARD_LINK_INCOMPLETE = "This link is missing the Board setup."

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
  storedKey: string | null
): BoardReadiness => {
  const usableConfig = isUsableBoardConfig(config)
  const hasKey = Boolean(config.key?.trim() || storedKey?.trim())
  return { usableConfig, hasKey, ready: usableConfig }
}

export const isBoardReady = (
  config: BoardConfig,
  storedKey: string | null
): boolean => resolveBoardReadiness(config, storedKey).ready

/** Previews with no usable hash still show the Oxford Circus demo board. */
export const withDemoBoardFallback = (config: BoardConfig): BoardConfig =>
  isUsableBoardConfig(config) ? config : DEMO_BOARD_CONFIG

const boardViewPathname = (pathname: string): boolean => {
  if (pathname === BOARD_VIEW_PATH) return true
  return pathname === `${BOARD_VIEW_PATH}/`
}

/**
 * Parse a pasted Board URL. A usable layout is enough. A key in the fragment
 * is accepted when present and is not required.
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
  if (!isUsableBoardConfig(config)) {
    return { ok: false, error: BOARD_LINK_INCOMPLETE }
  }
  const key = config.key?.trim() || null
  return { ok: true, config, key }
}
