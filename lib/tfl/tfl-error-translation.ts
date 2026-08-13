import { redactSecrets } from "@/lib/tfl/redact-secrets";

export type TranslatedTflErrorKind =
  | "invalid-key"
  | "rate-limited"
  | "network"
  | "unknown";

export type TranslatedTflError = {
  kind: TranslatedTflErrorKind;
  message: string;
};

const STATUS_HINTS: { re: RegExp; kind: TranslatedTflErrorKind; message: string }[] =
  [
    {
      re: /\b401\b|unauthoris|unauthoriz|forbidden|\b403\b|invalid.*(key|app_key)|app_key/i,
      kind: "invalid-key",
      message:
        "TfL rejected this API key. Check Profile → Show on the API portal, or regenerate the key.",
    },
    {
      re: /\b429\b|rate.?limit|too many requests|quota/i,
      kind: "rate-limited",
      message:
        "TfL rate-limited this key. Wait a moment, or check your subscription quota on the API portal.",
    },
    {
      re: /failed to fetch|networkerror|cors|load failed|abort/i,
      kind: "network",
      message:
        "Could not reach the TfL API from this browser. Check your network connection.",
    },
  ];

/**
 * Map a raw tfl-ts / fetch failure into a closed, user-facing error.
 * Always redacts any known secrets from residual message text.
 */
export const translateTflClientError = (
  error: unknown,
  secrets: readonly string[] = [],
): TranslatedTflError => {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Request failed.";
  const redacted = redactSecrets(raw, secrets);

  for (const hint of STATUS_HINTS) {
    if (hint.re.test(redacted)) {
      return { kind: hint.kind, message: hint.message };
    }
  }

  return {
    kind: "unknown",
    message:
      "Something went wrong talking to TfL. Try again, or replace your API key.",
  };
};
