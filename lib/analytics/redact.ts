import { redactSecrets } from "@/lib/tfl/redact-secrets"
import {
  ANALYTICS_ALLOWED_KEYS,
  type AnalyticsEventProps,
} from "@/lib/analytics/events"

const CREDENTIAL_QUERY = /(?:^|[?&#])(key|app_key|appKey|app_id)=([^&#]*)/gi
const COORDINATE_KEY =
  /^(lat|lon|lng|latitude|longitude|accuracy|coords|coordinate)$/i
const SEARCH_KEY = /^(query|q|search|searchTerm|rawSearch)$/i
const SECRET_KEY = /^(key|appKey|app_key|app_id|authorization|password|secret)$/i
const PII_KEY = /^(email|name|phone|ip|address|userId|user_id)$/i

const looksLikeUrl = (value: string): boolean =>
  /^https?:\/\//i.test(value) || value.includes("/board/view")

const redactCredentialedUrl = (value: string): string => {
  if (!looksLikeUrl(value)) return value
  return value.replace(CREDENTIAL_QUERY, (_, name: string) => `${name}=•••`)
}

/**
 * Drop disallowed keys and redact leftover strings before analytics.
 * Known secrets are replaced even if they appear inside a allowed string.
 */
export const redactAnalyticsProps = (
  props: Record<string, unknown>,
  secrets: readonly string[] = []
): Partial<AnalyticsEventProps> => {
  const next: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(props)) {
    if (SECRET_KEY.test(key) || COORDINATE_KEY.test(key) || SEARCH_KEY.test(key)) {
      continue
    }
    if (PII_KEY.test(key)) continue
    if (!(ANALYTICS_ALLOWED_KEYS as readonly string[]).includes(key)) continue
    if (value === undefined) continue

    if (typeof value === "string") {
      next[key] = redactSecrets(redactCredentialedUrl(value), secrets)
      continue
    }
    if (
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null
    ) {
      next[key] = value
    }
  }

  return next as Partial<AnalyticsEventProps>
}
