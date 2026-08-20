/**
 * Pure unattended frame controller. Callers inject `nowMs`.
 * Pass `startDelayMs` so panels on one board do not advance together.
 */

export const UNATTENDED_DEFAULT_DWELL_MS = 10_000

export type DisplayBehaviour = "interactive" | "unattended"

export type UnattendedPauseReason = "focus" | "hidden"

export const isDocumentHidden = (
  visibilityState: DocumentVisibilityState
): boolean => visibilityState === "hidden"

export type UnattendedSequenceState = {
  index: number
  itemId: string | null
  elapsedMs: number
  lastTickMs: number
  remainingStartDelayMs: number
}

export type TickUnattendedSequenceOptions = {
  itemIds: readonly string[]
  nowMs: number
  dwellMs?: number
  pauseReasons?: readonly UnattendedPauseReason[]
}

export const createUnattendedSequence = (options: {
  itemIds: readonly string[]
  nowMs: number
  startDelayMs?: number
}): UnattendedSequenceState => {
  const itemId = options.itemIds[0] ?? null
  return {
    index: 0,
    itemId,
    elapsedMs: 0,
    lastTickMs: options.nowMs,
    remainingStartDelayMs: Math.max(0, options.startDelayMs ?? 0),
  }
}

const nearestIndex = (previousIndex: number, itemCount: number): number => {
  if (itemCount <= 0) return 0
  if (previousIndex < itemCount) return previousIndex
  return itemCount - 1
}

/**
 * Keep the current item when it still exists (even if the list reordered).
 * When it disappears, move to the nearest remaining index.
 */
export const reconcileUnattendedSequence = (
  state: UnattendedSequenceState,
  nextItemIds: readonly string[]
): UnattendedSequenceState => {
  if (nextItemIds.length === 0) {
    return { ...state, index: 0, itemId: null, elapsedMs: 0 }
  }
  if (state.itemId) {
    const kept = nextItemIds.indexOf(state.itemId)
    if (kept >= 0) {
      return { ...state, index: kept, itemId: nextItemIds[kept] ?? null }
    }
  }
  const index = nearestIndex(state.index, nextItemIds.length)
  return {
    ...state,
    index,
    itemId: nextItemIds[index] ?? null,
    elapsedMs: 0,
  }
}

const isPaused = (
  reasons: readonly UnattendedPauseReason[] | undefined
): boolean => Boolean(reasons && reasons.length > 0)

/** 0–1 through the current dwell. Stays 0 for one frame or during start delay. */
export const unattendedDwellProgress = (
  state: UnattendedSequenceState,
  options: { dwellMs?: number; itemCount: number }
): number => {
  if (options.itemCount <= 1) return 0
  if (state.remainingStartDelayMs > 0) return 0
  const dwellMs = Math.max(1, options.dwellMs ?? UNATTENDED_DEFAULT_DWELL_MS)
  return Math.min(1, state.elapsedMs / dwellMs)
}

/** Advance elapsed time. Pause reasons freeze the current frame. */
export const tickUnattendedSequence = (
  state: UnattendedSequenceState,
  options: TickUnattendedSequenceOptions
): UnattendedSequenceState => {
  const reconciled = reconcileUnattendedSequence(state, options.itemIds)
  const deltaMs = Math.max(0, options.nowMs - reconciled.lastTickMs)
  const hidden = options.pauseReasons?.includes("hidden") ?? false

  if (options.itemIds.length <= 1) {
    return {
      ...reconciled,
      index: 0,
      itemId: options.itemIds[0] ?? null,
      elapsedMs: 0,
      lastTickMs: options.nowMs,
    }
  }

  if (hidden || isPaused(options.pauseReasons)) {
    return { ...reconciled, lastTickMs: options.nowMs }
  }

  let remainingStartDelayMs = reconciled.remainingStartDelayMs
  let elapsedMs = reconciled.elapsedMs
  let index = reconciled.index

  if (remainingStartDelayMs > 0) {
    if (deltaMs < remainingStartDelayMs) {
      return {
        ...reconciled,
        remainingStartDelayMs: remainingStartDelayMs - deltaMs,
        lastTickMs: options.nowMs,
      }
    }
    const leftover = deltaMs - remainingStartDelayMs
    remainingStartDelayMs = 0
    elapsedMs += leftover
  } else {
    elapsedMs += deltaMs
  }

  const dwellMs = Math.max(1, options.dwellMs ?? UNATTENDED_DEFAULT_DWELL_MS)
  const itemCount = options.itemIds.length
  while (elapsedMs >= dwellMs && itemCount > 0) {
    elapsedMs -= dwellMs
    index = (index + 1) % itemCount
  }

  return {
    index,
    itemId: options.itemIds[index] ?? null,
    elapsedMs,
    lastTickMs: options.nowMs,
    remainingStartDelayMs,
  }
}

/**
 * After a hidden document becomes visible again, restart the current frame
 * so the reader gets a full dwell.
 */
export const resumeUnattendedSequence = (
  state: UnattendedSequenceState,
  nowMs: number
): UnattendedSequenceState => ({
  ...state,
  elapsedMs: 0,
  lastTickMs: nowMs,
})

const SENTENCE_SPLIT = /(?<=[.!?])\s+/

/**
 * Split long copy at sentence boundaries. If one sentence still exceeds
 * `maxChars`, fall back to word wraps. Empty input yields no frames.
 */
export const splitTextFrames = (text: string, maxChars: number): string[] => {
  const trimmed = text.trim()
  if (!trimmed) return []
  if (maxChars <= 0 || trimmed.length <= maxChars) return [trimmed]

  const sentences = trimmed.split(SENTENCE_SPLIT).filter(Boolean)
  const frames: string[] = []
  let current = ""

  const flush = () => {
    const piece = current.trim()
    if (piece) frames.push(piece)
    current = ""
  }

  const pushWords = (sentence: string) => {
    for (const word of sentence.split(/\s+/).filter(Boolean)) {
      const next = current ? `${current} ${word}` : word
      if (next.length > maxChars && current) {
        flush()
        current = word
      } else {
        current = next
      }
    }
  }

  for (const sentence of sentences) {
    const next = current ? `${current} ${sentence}` : sentence
    if (next.length <= maxChars) {
      current = next
      continue
    }
    if (current) flush()
    if (sentence.length <= maxChars) {
      current = sentence
      continue
    }
    pushWords(sentence)
  }
  flush()
  return frames.length > 0 ? frames : [trimmed]
}
