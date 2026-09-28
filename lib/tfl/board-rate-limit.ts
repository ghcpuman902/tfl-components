/**
 * Visitor-facing rate-limit copy for the hosted Board.
 * The project key stays on the server. This screen is the recovery path
 * when TfL quota is exhausted — not a prompt to register a personal key.
 */

export const BOARD_RATE_LIMIT_TITLE = "Too many boards right now"

export const BOARD_RATE_LIMIT_BODY =
  "Live departures are paused. Try again later."

export const BOARD_RATE_LIMIT_RETRY = "Try again"

/** Panel fallback when some of the board still has data. */
export const BOARD_RATE_LIMIT_INLINE =
  "Live updates are paused. Try again in a moment."

const RATE_LIMIT_RE = /\b429\b|rate.?limit|too many requests|quota/i

const readErrorChunks = (error: unknown, depth = 0): string[] => {
  if (depth > 4 || error == null) return []
  if (typeof error === "string" || typeof error === "number") {
    return [String(error)]
  }
  if (error instanceof Error) {
    return [error.message, ...readErrorChunks(error.cause, depth + 1)]
  }
  if (typeof error === "object") {
    const record = error as Record<string, unknown>
    const chunks: string[] = []
    for (const key of [
      "status",
      "statusCode",
      "httpStatus",
      "httpStatusCode",
      "message",
    ]) {
      const value = record[key]
      if (typeof value === "string" || typeof value === "number") {
        chunks.push(String(value))
      }
    }
    if ("cause" in record) chunks.push(...readErrorChunks(record.cause, depth + 1))
    return chunks
  }
  return []
}

/** True when a TfL client failure is quota / HTTP 429, not a bad stop or network drop. */
export const isTflRateLimitError = (error: unknown): boolean =>
  RATE_LIMIT_RE.test(readErrorChunks(error).join(" "))
