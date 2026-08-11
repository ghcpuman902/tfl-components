import type { FeedbackFields } from "./schema";

/**
 * Ensure pageUrl is same-origin as the request host (or localhost in dev).
 * Rejects javascript:, data:, and cross-site URLs.
 */
export const isAllowedPageUrl = (
  pageUrl: string,
  requestOrigin: string | null,
): boolean => {
  let parsed: URL;
  try {
    parsed = new URL(pageUrl);
  } catch {
    return false;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return false;
  }

  if (!requestOrigin) {
    return (
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname.endsWith(".vercel.app")
    );
  }

  let origin: URL;
  try {
    origin = new URL(requestOrigin);
  } catch {
    return false;
  }

  return parsed.origin === origin.origin;
};

export type SoftSuccess = {
  ok: true;
  soft: true;
};

export type HardSuccess = {
  ok: true;
  soft?: false;
};

export type FeedbackError = {
  ok: false;
  error: string;
};

export type FeedbackResult = SoftSuccess | HardSuccess | FeedbackError;

/** Silent thank-you for bots/spam — never tip them off. */
export const softThanks = (): SoftSuccess => ({ ok: true, soft: true });

export type ValidatedSubmission = {
  fields: FeedbackFields;
};
