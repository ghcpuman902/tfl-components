/**
 * How the homepage reads a bus stop's arrivals from the server. The first read
 * for a stop can be slow on a cold server, so it waits longer and is retried
 * once before "unavailable" is shown; later polls are short because the rows
 * already shown are kept when one fails.
 */

export const FIRST_READ_TIMEOUT_MS = 20_000
export const POLL_TIMEOUT_MS = 8_000

export class ReadTimeoutError extends Error {
  constructor() {
    super("timeout")
    this.name = "ReadTimeoutError"
  }
}

/** Rejects with `ReadTimeoutError` if `promise` has not settled within `ms`. */
export const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new ReadTimeoutError()), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error: unknown) => {
        clearTimeout(timer)
        reject(error)
      }
    )
  })

export type ReadPlan = { timeoutMs: number; retries: number }

/** Patient with no rows to show yet; quick once rows are held (a failed poll keeps them). */
export const busReadPlan = (holdsRows: boolean): ReadPlan =>
  holdsRows
    ? { timeoutMs: POLL_TIMEOUT_MS, retries: 0 }
    : { timeoutMs: FIRST_READ_TIMEOUT_MS, retries: 1 }

/**
 * Calls `read` under the plan. A timeout or a thrown error is retried at once,
 * up to `retries` times; an answer (even `ok: false`) is returned as it is.
 */
export const readWithRetry = async <T>(
  read: () => Promise<T>,
  plan: ReadPlan
): Promise<T> => {
  for (let attempt = 0; ; attempt++) {
    try {
      return await withTimeout(read(), plan.timeoutMs)
    } catch (error) {
      if (attempt >= plan.retries) throw error
    }
  }
}

/** After a failed read: rows already shown for this stop stay; otherwise the failure stands. */
export const keepHeldOnFailure = <
  S extends { id: string; state: { status: string } },
>(
  held: S | null,
  id: string,
  failed: S
): S => (held?.id === id && held.state.status === "ok" ? held : failed)
