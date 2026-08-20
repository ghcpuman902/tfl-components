import type TflClient from "tfl-ts"
import { translateTflClientError } from "@/lib/tfl/tfl-error-translation"

/**
 * Create a browser-side tfl-ts client with the visitor's key.
 * Site-only — never import into registry components or Server Actions.
 */
export const createBrowserTflClient = async (
  appKey: string
): Promise<TflClient> => {
  const trimmed = appKey.trim()
  if (!trimmed) {
    throw new Error("Missing TfL API key.")
  }
  const { default: BrowserTflClient } = await import("tfl-ts")
  return new BrowserTflClient({ appKey: trimmed })
}

/**
 * Lightweight validation request: tube line status with the candidate key.
 * Goes directly to api.tfl.gov.uk — never to our origin.
 */
export const validateUserTflAppKey = async (
  appKey: string
): Promise<
  | { ok: true }
  | { ok: false; error: ReturnType<typeof translateTflClientError> }
> => {
  const trimmed = appKey.trim()
  try {
    const client = await createBrowserTflClient(trimmed)
    await client.line.getStatus({ modes: ["tube"] })
    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      error: translateTflClientError(error, [trimmed]),
    }
  }
}
