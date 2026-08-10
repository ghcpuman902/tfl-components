import * as React from "react";
import { highlight } from "sugar-high";
import { cn } from "@/lib/utils";

type SyntaxHighlightedCodeProps = {
  code: string;
  language?: string;
  className?: string;
  preClassName?: string;
  wrapperClassName?: string;
  showCopy?: boolean;
};

/** Inline SVGs — lucide-react is a client module and breaks RSC instant validation. */
const CopyIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </svg>
);

const CheckIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const normalizeLanguage = (language?: string): string | undefined => {
  if (!language) return undefined;
  const lang = language.toLowerCase().replace(/^\./, "");
  if (lang === "typescript") return "ts";
  if (lang === "javascript") return "js";
  if (lang === "shell" || lang === "sh" || lang === "zsh" || lang === "console") {
    return "bash";
  }
  if (lang === "yml") return "yaml";
  return lang;
};

const highlightCode = (code: string): string | null => {
  try {
    return highlight(code);
  } catch {
    return null;
  }
};

/**
 * Fully server-rendered code block. Copy uses `data-mdx-copy` + the layout
 * `CodeCopyDelegator` so MDX stays outside client boundaries (stable instant
 * validation / hydration under Cache Components).
 */
export const SyntaxHighlightedCode = ({
  code,
  language,
  className,
  preClassName,
  wrapperClassName,
  showCopy = true,
}: SyntaxHighlightedCodeProps) => {
  const highlightedHtml = highlightCode(code);
  const normalized = normalizeLanguage(language);

  return (
    <div className={cn("group/code relative mb-4 mt-6 w-full", wrapperClassName)}>
      {showCopy ? (
        <button
          type="button"
          data-mdx-copy
          data-copied="false"
          aria-label="Copy code"
          className={cn(
            "group/copy absolute top-2 right-2 z-10 inline-flex h-8 items-center gap-1.5 rounded-lg border border-border/60 bg-background px-2.5 text-sm font-medium text-foreground shadow-xs",
            "opacity-100 sm:opacity-0 sm:transition-opacity",
            "sm:group-hover/code:opacity-100 sm:focus-visible:opacity-100",
            "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
        >
          <span className="relative size-3.5 shrink-0" aria-hidden>
            <CopyIcon className="absolute inset-0 size-3.5 transition-opacity group-data-[copied=true]/copy:opacity-0" />
            <CheckIcon className="absolute inset-0 size-3.5 opacity-0 transition-opacity group-data-[copied=true]/copy:opacity-100" />
          </span>
          <span data-mdx-copy-label>Copy</span>
        </button>
      ) : null}

      <pre
        className={cn(
          "block w-full overflow-x-auto rounded-lg bg-muted py-3 pr-14 pl-4 text-sm leading-normal",
          preClassName,
        )}
        data-language={normalized || undefined}
      >
        {highlightedHtml ? (
          <code
            className={cn(
              "font-mono text-[0.925em] leading-normal text-foreground bg-transparent p-0",
              className,
            )}
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
          />
        ) : (
          <code
            className={cn(
              "font-mono text-[0.925em] leading-normal text-foreground",
              className,
            )}
          >
            {code}
          </code>
        )}
      </pre>
    </div>
  );
};

const getTextContent = (node: React.ReactNode): string => {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(getTextContent).join("");
  if (React.isValidElement(node)) {
    return getTextContent(
      (node.props as { children?: React.ReactNode }).children,
    );
  }
  return "";
};

/** MDX `<pre>` wrapper: extracts fenced code + language, then highlights. */
export const MdxSyntaxPre = ({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) => {
  const items = React.Children.toArray(children);
  let code = "";
  let language: string | undefined;

  for (const child of items) {
    if (!React.isValidElement(child)) continue;
    const props = child.props as {
      className?: string;
      children?: React.ReactNode;
    };
    const match = /language-([a-zA-Z0-9_+-]+)/.exec(props.className ?? "");
    const text = getTextContent(props.children).replace(/\n$/, "");
    if (text) {
      code = text;
      language = match?.[1];
      break;
    }
  }

  if (!code) {
    code = getTextContent(children).replace(/\n$/, "");
  }

  if (!code) {
    return (
      <pre
        className={cn(
          "mb-4 mt-6 block w-full overflow-x-auto rounded-lg bg-muted p-4 text-sm",
          className,
        )}
      >
        {children}
      </pre>
    );
  }

  return (
    <SyntaxHighlightedCode
      code={code}
      language={language}
      preClassName={className}
    />
  );
};
