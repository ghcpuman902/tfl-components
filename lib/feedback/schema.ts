import { z } from "zod";
import {
  ALLOWED_SCREENSHOT_TYPES,
  MAX_EMAIL_CHARS,
  MAX_MESSAGE_CHARS,
  MAX_PAGE_TITLE_CHARS,
  MAX_PAGE_URL_CHARS,
  type FeedbackKind,
} from "./constants";

const kindSchema = z.enum(["bug", "suggestion"]);

const optionalEmailSchema = z
  .string()
  .trim()
  .max(MAX_EMAIL_CHARS)
  .transform((value) => (value.length === 0 ? undefined : value))
  .pipe(z.email().max(MAX_EMAIL_CHARS).optional());

export const feedbackFieldsSchema = z.object({
  kind: kindSchema,
  message: z
    .string()
    .trim()
    .min(1, "Tell us a bit more.")
    .max(MAX_MESSAGE_CHARS),
  email: optionalEmailSchema,
  pageUrl: z.string().trim().min(1).max(MAX_PAGE_URL_CHARS),
  pageTitle: z.string().trim().max(MAX_PAGE_TITLE_CHARS).optional().default(""),
  appVersion: z.string().trim().max(32).optional().default(""),
  loadedAt: z.coerce.number().int().positive(),
  company_website: z.string().optional().default(""),
});

export type FeedbackFields = z.infer<typeof feedbackFieldsSchema>;

export type ParsedScreenshot = {
  filename: string;
  contentType: (typeof ALLOWED_SCREENSHOT_TYPES)[number];
  bytes: Buffer;
};

export const isAllowedScreenshotType = (
  type: string,
): type is (typeof ALLOWED_SCREENSHOT_TYPES)[number] =>
  (ALLOWED_SCREENSHOT_TYPES as readonly string[]).includes(type);

export const kindLabel = (kind: FeedbackKind): string =>
  kind === "bug" ? "Bug report" : "Suggestion";
