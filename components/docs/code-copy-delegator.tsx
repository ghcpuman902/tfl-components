"use client";

import * as React from "react";
import { domToMarkdown } from "@/lib/docs/dom-to-markdown";
import { openFeedbackDialog } from "@/lib/feedback/open";

const COPIED_MS = 2000;

const setCopiedState = (
  button: HTMLButtonElement,
  ok: boolean,
  idleLabel: string,
  copiedLabel: string,
) => {
  const label = button.querySelector("[data-mdx-copy-label]");
  button.setAttribute("aria-label", ok ? copiedLabel : idleLabel);
  button.dataset.copied = ok ? "true" : "false";
  if (label) label.textContent = ok ? copiedLabel : idleLabel;
  window.setTimeout(() => {
    button.setAttribute("aria-label", idleLabel);
    button.dataset.copied = "false";
    if (label) label.textContent = idleLabel;
  }, COPIED_MS);
};

/**
 * Document-level click handler for server-rendered docs chrome:
 * - `[data-mdx-copy]` — copy a code fence
 * - `[data-copy-page]` — serialize nearest `<article>` to Markdown
 * - `[data-code-peek-toggle]` — expand/collapse a peek code panel
 * - `[data-open-feedback]` — open the site feedback dialog
 *
 * Keeps MDX / peek blocks free of client component boundaries (Cache Components).
 */
export const CodeCopyDelegator = () => {
  React.useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const openFeedback = target.closest<HTMLButtonElement>(
        "[data-open-feedback]",
      );
      if (openFeedback) {
        event.preventDefault();
        openFeedbackDialog();
        return;
      }

      const peekToggle = target.closest<HTMLButtonElement>(
        "[data-code-peek-toggle]",
      );
      if (peekToggle) {
        event.preventDefault();
        const panel = peekToggle.closest<HTMLElement>("[data-code-peek]");
        if (!panel) return;
        const expanded = panel.getAttribute("data-expanded") === "true";
        const next = expanded ? "false" : "true";
        panel.setAttribute("data-expanded", next);
        const body = panel.querySelector<HTMLElement>("[data-peek-body]");
        if (body) {
          if (next === "true") {
            body.style.maxHeight = "none";
          } else {
            body.style.removeProperty("max-height");
            // Restore collapsed clamp from data attribute if present.
            const clamp = panel.getAttribute("data-peek-max");
            if (clamp) body.style.maxHeight = clamp;
          }
        }
        const label = peekToggle.querySelector("[data-code-peek-label]");
        if (label) {
          label.textContent = next === "true" ? "Hide code" : "View code";
        }
        peekToggle.setAttribute("aria-expanded", next);
        return;
      }

      const copyPage = target.closest<HTMLButtonElement>("[data-copy-page]");
      if (copyPage) {
        event.preventDefault();
        const article =
          copyPage.closest("article") ??
          document.querySelector("article");
        if (!article) return;
        const markdown = domToMarkdown(article);
        void navigator.clipboard.writeText(markdown).then(
          () => setCopiedState(copyPage, true, "Copy page", "Copied"),
          () => setCopiedState(copyPage, false, "Copy page", "Copy page"),
        );
        return;
      }

      const copyText = target.closest<HTMLButtonElement>("[data-copy-text]");
      if (copyText) {
        event.preventDefault();
        const text = copyText.getAttribute("data-copy-text") ?? "";
        if (!text) return;
        void navigator.clipboard.writeText(text).then(
          () =>
            setCopiedState(
              copyText,
              true,
              "Copy install command",
              "Copied",
            ),
          () =>
            setCopiedState(
              copyText,
              false,
              "Copy install command",
              "Copy install command",
            ),
        );
        return;
      }

      const button = target.closest<HTMLButtonElement>("[data-mdx-copy]");
      if (!button) return;

      const group =
        button.closest("[class*='group/code']") ??
        button.closest("[data-code-peek]") ??
        button.parentElement;
      const codeEl = group?.querySelector("pre code");
      const text = codeEl?.textContent ?? "";
      if (!text) return;

      event.preventDefault();
      void navigator.clipboard.writeText(text).then(
        () => setCopiedState(button, true, "Copy code", "Copied"),
        () => setCopiedState(button, false, "Copy code", "Copy code"),
      );
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return null;
};
