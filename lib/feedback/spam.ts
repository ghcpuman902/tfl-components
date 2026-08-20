import { MAX_MESSAGE_CHARS, MIN_SUBMIT_MS } from "./constants"

const URL_RE = /https?:\/\/|www\./gi
const GIBBERISH_RE = /(.)\1{8,}|[^\s]{80,}/

export type SpamCheckResult =
  { ok: true } | { ok: false; reason: "honeypot" | "too_fast" | "spam_content" }

export const checkHoneypot = (value: string | undefined): boolean =>
  Boolean(value && value.trim().length > 0)

export const checkSubmitTiming = (loadedAt: number, nowMs: number): boolean => {
  if (!Number.isFinite(loadedAt) || loadedAt <= 0) return false
  const elapsed = nowMs - loadedAt
  return elapsed >= MIN_SUBMIT_MS && elapsed < 1000 * 60 * 60 * 24
}

export const countLinks = (text: string): number => {
  const matches = text.match(URL_RE)
  return matches?.length ?? 0
}

export const looksLikeSpam = (message: string): boolean => {
  const trimmed = message.trim()
  if (trimmed.length < 2 || trimmed.length > MAX_MESSAGE_CHARS) return true
  if (countLinks(trimmed) > 3) return true
  if (GIBBERISH_RE.test(trimmed)) return true
  return false
}

export const checkSpamSignals = (input: {
  honeypot: string | undefined
  loadedAt: number
  message: string
  nowMs: number
}): SpamCheckResult => {
  if (checkHoneypot(input.honeypot)) {
    return { ok: false, reason: "honeypot" }
  }
  if (!checkSubmitTiming(input.loadedAt, input.nowMs)) {
    return { ok: false, reason: "too_fast" }
  }
  if (looksLikeSpam(input.message)) {
    return { ok: false, reason: "spam_content" }
  }
  return { ok: true }
}
