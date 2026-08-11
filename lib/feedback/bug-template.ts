import { DOCS_ENTRIES } from "@/lib/docs-catalog";

export const BUG_DESCRIPTION_LABEL =
  "What happened, and what did you expect instead?";
export const BUG_STEPS_LABEL = "Steps to reproduce";
export const BUG_COMPONENT_LABEL = "Component or page affected";

const sectionHeading = (label: string): string => `::: ${label} :::`;

/** Catalog titles for the bug “component or page” autosuggest. */
export const FEEDBACK_COMPONENT_OPTIONS: readonly string[] = [
  ...new Set(DOCS_ENTRIES.map((entry) => entry.title)),
].sort((a, b) => a.localeCompare(b));

export const buildBugTemplate = (
  description: string,
  steps: string,
  component: string,
): string =>
  [
    sectionHeading(BUG_DESCRIPTION_LABEL),
    description,
    "",
    sectionHeading(BUG_STEPS_LABEL),
    steps,
    "",
    sectionHeading(BUG_COMPONENT_LABEL),
    component,
  ].join("\n");

export type ParsedBugTemplate = {
  description: string;
  steps: string;
  component: string;
  /** True when at least one `::: … :::` section heading was recognized. */
  matched: boolean;
};

const SECTION_HEADING_RE = /^:::\s*(.+?)\s*:::\s*$/gm;

const normalizeLabel = (label: string): string =>
  label.trim().toLowerCase().replace(/:$/, "");

const fieldForLabel = (
  label: string,
): keyof Pick<ParsedBugTemplate, "description" | "steps" | "component"> | null => {
  const normalized = normalizeLabel(label);
  if (normalized === normalizeLabel(BUG_DESCRIPTION_LABEL)) return "description";
  if (normalized === normalizeLabel(BUG_STEPS_LABEL)) return "steps";
  if (normalized === normalizeLabel(BUG_COMPONENT_LABEL)) return "component";
  return null;
};

/**
 * Best-effort parse of freeform bug text back into structured fields.
 * Splits on `::: heading :::` markers written by `buildBugTemplate`.
 * Unstructured notes (no markers) land in description.
 */
export const parseBugTemplate = (text: string): ParsedBugTemplate => {
  const trimmed = text.trim();
  if (!trimmed) {
    return { description: "", steps: "", component: "", matched: false };
  }

  const headings: Array<{ field: "description" | "steps" | "component"; index: number; end: number }> =
    [];

  for (const match of trimmed.matchAll(SECTION_HEADING_RE)) {
    const label = match[1] ?? "";
    const field = fieldForLabel(label);
    if (!field || match.index == null) continue;
    headings.push({
      field,
      index: match.index,
      end: match.index + match[0].length,
    });
  }

  if (headings.length === 0) {
    return {
      description: trimmed,
      steps: "",
      component: "",
      matched: false,
    };
  }

  const result: ParsedBugTemplate = {
    description: "",
    steps: "",
    component: "",
    matched: true,
  };

  for (let i = 0; i < headings.length; i += 1) {
    const current = headings[i];
    const next = headings[i + 1];
    const body = trimmed
      .slice(current.end, next ? next.index : trimmed.length)
      .replace(/^\n+/, "")
      .replace(/\n+$/, "")
      .trim();
    result[current.field] = body;
  }

  return result;
};

/** Prefer a catalog title for the current path; fall back to document title. */
export const suggestComponentForPage = (
  pathname: string,
  pageTitle: string,
): string => {
  const exact = DOCS_ENTRIES.find((entry) => entry.href === pathname);
  if (exact) return exact.title;

  const prefix = DOCS_ENTRIES.filter(
    (entry) => entry.href !== "/" && pathname.startsWith(`${entry.href}/`),
  ).sort((a, b) => b.href.length - a.href.length)[0];
  if (prefix) return prefix.title;

  const titleWithoutSite = pageTitle.replace(/\s*[·|].*$/, "").trim();
  const byTitle = DOCS_ENTRIES.find(
    (entry) =>
      entry.title.toLowerCase() === titleWithoutSite.toLowerCase() ||
      entry.title.toLowerCase() === pageTitle.toLowerCase(),
  );
  if (byTitle) return byTitle.title;

  return titleWithoutSite || pageTitle;
};
