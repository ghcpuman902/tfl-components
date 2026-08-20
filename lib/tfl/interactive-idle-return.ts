/**
 * Pure idle-return controller for interactive arrivals paging.
 * Callers inject `nowMs`. After inactivity on a non-first page, return to page 1.
 */

export const INTERACTIVE_IDLE_RETURN_MS = 30_000

export type IdleReturnState = {
  lastActivityMs: number
  suspended: boolean
}

export const createIdleReturnState = (
  nowMs: number,
  suspended = false
): IdleReturnState => ({
  lastActivityMs: nowMs,
  suspended,
})

export const registerIdleActivity = (nowMs: number): IdleReturnState => ({
  lastActivityMs: nowMs,
  suspended: false,
})

export const suspendIdleReturn = (state: IdleReturnState): IdleReturnState => ({
  ...state,
  suspended: true,
})

export const resumeIdleReturn = (
  state: IdleReturnState,
  nowMs: number
): IdleReturnState => ({
  lastActivityMs: nowMs,
  suspended: false,
})

export const shouldReturnToFirstPage = (
  state: IdleReturnState,
  nowMs: number,
  idleMs = INTERACTIVE_IDLE_RETURN_MS
): boolean => !state.suspended && nowMs - state.lastActivityMs >= idleMs
