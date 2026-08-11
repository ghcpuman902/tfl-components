import { headers } from "next/headers";
import { Resend } from "resend";
import {
  FEEDBACK_FROM,
  FEEDBACK_TO,
  HONEYPOT_FIELD,
  LOADED_AT_FIELD,
  MAX_BODY_BYTES,
  MAX_SCREENSHOT_BYTES,
} from "@/lib/feedback/constants";
import {
  buildFeedbackHtml,
  buildFeedbackSubject,
  buildFeedbackText,
} from "@/lib/feedback/email";
import {
  feedbackFieldsSchema,
  isAllowedScreenshotType,
  type ParsedScreenshot,
} from "@/lib/feedback/schema";
import { checkSpamSignals } from "@/lib/feedback/spam";
import { isAllowedPageUrl, softThanks } from "@/lib/feedback/validate-url";

const json = (body: unknown, init?: ResponseInit) =>
  Response.json(body, init);

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return json({ ok: false, error: "Payload too large." }, { status: 413 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, error: "Invalid form data." }, { status: 400 });
  }

  const raw = {
    kind: String(form.get("kind") ?? ""),
    message: String(form.get("message") ?? ""),
    email: String(form.get("email") ?? ""),
    pageUrl: String(form.get("pageUrl") ?? ""),
    pageTitle: String(form.get("pageTitle") ?? ""),
    appVersion: String(form.get("appVersion") ?? ""),
    loadedAt: String(form.get(LOADED_AT_FIELD) ?? ""),
    company_website: String(form.get(HONEYPOT_FIELD) ?? ""),
  };

  const parsed = feedbackFieldsSchema.safeParse(raw);
  if (!parsed.success) {
    return json(
      { ok: false, error: "Please check your answers and try again." },
      { status: 400 },
    );
  }

  const fields = parsed.data;
  const nowMs = Date.now();
  const spam = checkSpamSignals({
    honeypot: fields.company_website,
    loadedAt: fields.loadedAt,
    message: fields.message,
    nowMs,
  });

  // Soft-fail bots and spam: thank them without sending mail.
  if (!spam.ok) {
    return json(softThanks());
  }

  const requestHeaders = await headers();
  const requestOrigin =
    requestHeaders.get("origin") ??
    (requestHeaders.get("host")
      ? `${requestHeaders.get("x-forwarded-proto") ?? "https"}://${requestHeaders.get("host")}`
      : null);

  if (!isAllowedPageUrl(fields.pageUrl, requestOrigin)) {
    return json({ ok: false, error: "Invalid page URL." }, { status: 400 });
  }

  const screenshot = await parseScreenshot(form.get("screenshot"));
  if (screenshot === "invalid") {
    return json(
      { ok: false, error: "Screenshot must be a JPEG, PNG, or WebP under 1.5MB." },
      { status: 400 },
    );
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[feedback] RESEND_API_KEY is not configured");
    return json(
      { ok: false, error: "Feedback is temporarily unavailable." },
      { status: 503 },
    );
  }

  const from = process.env.FEEDBACK_FROM ?? FEEDBACK_FROM;
  const to = process.env.FEEDBACK_TO ?? FEEDBACK_TO;
  const resend = new Resend(apiKey);
  const idempotencyKey = `feedback/${fields.loadedAt}/${hashIdempotency(fields.pageUrl, fields.message)}`;

  const { error } = await resend.emails.send(
    {
      from,
      to: [to],
      subject: buildFeedbackSubject(fields),
      text: buildFeedbackText(fields),
      html: buildFeedbackHtml(fields),
      replyTo: fields.email ? [fields.email] : undefined,
      tags: [
        { name: "category", value: "site-feedback" },
        { name: "kind", value: fields.kind },
      ],
      attachments: screenshot
        ? [
            {
              filename: screenshot.filename,
              content: screenshot.bytes,
              contentType: screenshot.contentType,
            },
          ]
        : undefined,
    },
    { idempotencyKey },
  );

  if (error) {
    console.error("[feedback] Resend error:", error.message);
    return json(
      { ok: false, error: "Could not send feedback. Try again shortly." },
      { status: 502 },
    );
  }

  return json({ ok: true });
}

const parseScreenshot = async (
  value: FormDataEntryValue | null,
): Promise<ParsedScreenshot | null | "invalid"> => {
  if (value == null || value === "") return null;
  if (!(value instanceof File)) return "invalid";
  if (value.size === 0) return null;
  if (value.size > MAX_SCREENSHOT_BYTES) return "invalid";
  if (!isAllowedScreenshotType(value.type)) return "invalid";

  const bytes = Buffer.from(await value.arrayBuffer());
  if (bytes.byteLength > MAX_SCREENSHOT_BYTES) return "invalid";

  const ext =
    value.type === "image/png"
      ? "png"
      : value.type === "image/webp"
        ? "webp"
        : "jpg";

  return {
    filename: `feedback-screenshot.${ext}`,
    contentType: value.type,
    bytes,
  };
};

const hashIdempotency = (pageUrl: string, message: string): string => {
  let hash = 0;
  const input = `${pageUrl}\n${message}`;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16);
};
