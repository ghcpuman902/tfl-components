"use client";

import * as React from "react";

const COPIED_MS = 2000;

/**
 * Document-level copy handler for server-rendered MDX code blocks.
 * Keeps code fences free of client component boundaries (Cache Components
 * instant validation / hydration stay stable).
 */
export const CodeCopyDelegator = () => {
  React.useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const button = target.closest<HTMLButtonElement>("[data-mdx-copy]");
      if (!button) return;

      const group =
        button.closest("[class*='group/code']") ?? button.parentElement;
      const codeEl = group?.querySelector("pre code");
      const text = codeEl?.textContent ?? "";
      if (!text) return;

      event.preventDefault();

      const label = button.querySelector("[data-mdx-copy-label]");
      const finish = (ok: boolean) => {
        button.setAttribute("aria-label", ok ? "Copied" : "Copy code");
        button.dataset.copied = ok ? "true" : "false";
        if (label) label.textContent = ok ? "Copied" : "Copy";
        window.setTimeout(() => {
          button.setAttribute("aria-label", "Copy code");
          button.dataset.copied = "false";
          if (label) label.textContent = "Copy";
        }, COPIED_MS);
      };

      void navigator.clipboard.writeText(text).then(
        () => finish(true),
        () => finish(false),
      );
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return null;
};
