/**
 * Pure unattended frame controller. Callers inject `nowMs`.
 * Pass `startDelayMs` so panels on one board do not advance together.
 */

export const UNATTENDED_DEFAULT_DWELL_MS = 10_000

/** Lyrics-style scroll: rest on each line, then ease one line up. */
export const UNATTENDED_SCROLL_HOLD_MS = 2200
export const UNATTENDED_SCROLL_MOVE_MS = 450

/**
 * Time a scrolled item needs to show every line: hold the first window, then
 * one move plus one hold per extra line. 0 when nothing scrolls.
 */
export const unattendedScrollDwellMs = (steps: number): number =>
  steps > 0
    ? UNATTENDED_SCROLL_HOLD_MS +
      steps * (UNATTENDED_SCROLL_MOVE_MS + UNATTENDED_SCROLL_HOLD_MS)
    : 0

/**
 * Dwell for one item: the base dwell, stretched to fit any longer per-item
 * need (a scroll that must reach its last line). Never shorter than the base.
 */
export const resolveUnattendedDwellMs = (
  itemId: string | null | undefined,
  options: {
    dwellMs?: number
    dwellMsById?: Readonly<Record<string, number>>
  }
): number => {
  const base = Math.max(1, options.dwellMs ?? UNATTENDED_DEFAULT_DWELL_MS)
  const own = itemId ? (options.dwellMsById?.[itemId] ?? 0) : 0
  return Math.max(base, own)
}

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
  /**
   * Times the current item's dwell restarted in place (hidden tab or
   * off-screen, then back). Anything timed to the dwell, like the progress
   * bar, keys on it to restart in step.
   */
  restarts: number
}

export type TickUnattendedSequenceOptions = {
  itemIds: readonly string[]
  nowMs: number
  dwellMs?: number
  /** Per-item dwell needs (e.g. scroll time); stretches, never shortens. */
  dwellMsById?: Readonly<Record<string, number>>
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
    restarts: 0,
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
  options: {
    dwellMs?: number
    dwellMsById?: Readonly<Record<string, number>>
    itemCount: number
  }
): number => {
  if (options.itemCount <= 1) return 0
  if (state.remainingStartDelayMs > 0) return 0
  const dwellMs = resolveUnattendedDwellMs(state.itemId, options)
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

  const itemCount = options.itemIds.length
  const dwellAt = (at: number) =>
    resolveUnattendedDwellMs(options.itemIds[at], options)
  let dwellMs = dwellAt(index)
  while (elapsedMs >= dwellMs && itemCount > 0) {
    elapsedMs -= dwellMs
    index = (index + 1) % itemCount
    dwellMs = dwellAt(index)
  }

  return {
    index,
    itemId: options.itemIds[index] ?? null,
    elapsedMs,
    lastTickMs: options.nowMs,
    remainingStartDelayMs,
    restarts: reconciled.restarts,
  }
}

/**
 * After a hidden document or an off-screen panel is back, restart the current
 * frame so the reader gets a full dwell (and bump `restarts`).
 */
export const resumeUnattendedSequence = (
  state: UnattendedSequenceState,
  nowMs: number
): UnattendedSequenceState => ({
  ...state,
  elapsedMs: 0,
  lastTickMs: nowMs,
  restarts: state.restarts + 1,
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
