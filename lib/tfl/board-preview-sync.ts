/**
 * The builder's preview is an iframe of /board/view. Next.js inside the frame
 * owns that frame's history: a hash changed from outside (location.replace)
 * is written back to the old URL by the frame's router on its next history
 * sync, so the preview falls back to the stop it was first loaded with. The
 * builder therefore asks the board to change its own hash, and the board says
 * when it is listening so no change is lost while it loads.
 */
export const BOARD_PREVIEW_READY = "tfl-board-preview-ready"
export const BOARD_PREVIEW_HASH = "tfl-board-preview-hash"

export type BoardPreviewReadyMessage = { type: typeof BOARD_PREVIEW_READY }
export type BoardPreviewHashMessage = {
  type: typeof BOARD_PREVIEW_HASH
  hash: string
}

export const previewReadyMessage = (): BoardPreviewReadyMessage => ({
  type: BOARD_PREVIEW_READY,
})

export const previewHashMessage = (hash: string): BoardPreviewHashMessage => ({
  type: BOARD_PREVIEW_HASH,
  hash,
})

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

export const isPreviewReadyMessage = (data: unknown): boolean =>
  isRecord(data) && data.type === BOARD_PREVIEW_READY

/** The hash to show, or null when the message is not a preview hash. */
export const readPreviewHashMessage = (data: unknown): string | null => {
  if (!isRecord(data) || data.type !== BOARD_PREVIEW_HASH) return null
  const { hash } = data
  if (typeof hash !== "string") return null
  if (hash !== "" && !hash.startsWith("#")) return null
  return hash
}
