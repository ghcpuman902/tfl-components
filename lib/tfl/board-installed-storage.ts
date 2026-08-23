/**
 * Browser-only layout record for an installed Home Screen Board.
 * Never stores the TfL key — that stays in the credential store.
 * Never import from Server Components, Server Actions, or `"use cache"` modules.
 */

import {
  boardHashFromConfig,
  parseBoardConfig,
  type BoardConfig,
} from "@/lib/tfl/board-url-state"

export const BOARD_INSTALLED_STORAGE_KEY = "tfl-board-installed.v1"

export type StoredInstalledBoard = {
  v: 1
  hash: string
  savedAt: number
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

export const installedBoardHashFromConfig = (config: BoardConfig): string =>
  boardHashFromConfig({ ...config, key: undefined })

const parseStored = (raw: string | null): StoredInstalledBoard | null => {
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed)) return null
    if (parsed.v !== 1) return null
    if (typeof parsed.hash !== "string") return null
    if (typeof parsed.savedAt !== "number") return null
    return { v: 1, hash: parsed.hash, savedAt: parsed.savedAt }
  } catch {
    return null
  }
}

const getLocalStorage = (): Storage | null => {
  if (typeof window === "undefined") return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export const canUseInstalledBoardStorage = (): boolean => {
  const storage = getLocalStorage()
  if (!storage) return false
  try {
    const probe = `${BOARD_INSTALLED_STORAGE_KEY}.probe`
    storage.setItem(probe, "1")
    storage.removeItem(probe)
    return true
  } catch {
    return false
  }
}

export const readInstalledBoardRecord = (): StoredInstalledBoard | null => {
  const storage = getLocalStorage()
  if (!storage) return null
  try {
    return parseStored(storage.getItem(BOARD_INSTALLED_STORAGE_KEY))
  } catch {
    return null
  }
}

export const readInstalledBoardConfig = (): BoardConfig | null => {
  const stored = readInstalledBoardRecord()
  if (!stored || !stored.hash) return null
  return parseBoardConfig(stored.hash)
}

export const writeInstalledBoardConfig = (
  config: BoardConfig,
  savedAt: number
): StoredInstalledBoard | null => {
  const payload: StoredInstalledBoard = {
    v: 1,
    hash: installedBoardHashFromConfig(config),
    savedAt,
  }
  const storage = getLocalStorage()
  if (!storage) return null
  try {
    storage.setItem(BOARD_INSTALLED_STORAGE_KEY, JSON.stringify(payload))
    return payload
  } catch {
    return null
  }
}

export const clearInstalledBoardConfig = (): void => {
  const storage = getLocalStorage()
  try {
    storage?.removeItem(BOARD_INSTALLED_STORAGE_KEY)
  } catch {
    // ignore
  }
}
