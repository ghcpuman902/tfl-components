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
  /**
   * When set, collapse to this many lines with a fade + "View code" toggle
   * (expanded via `[data-code-peek-toggle]` in CodeCopyDelegator).
   */
  peekLines?: number;
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

const ChevronIcon = ({ className }: { className?: string }) => (
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
    <path d="m6 9 6 6 6-6" />
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
 * Fully server-rendered code block. Copy / peek expand use `data-*` attrs +
 * the layout `CodeCopyDelegator` so MDX stays outside client boundaries
 * (stable instant validation / hydration under Cache Components).
 */
export const SyntaxHighlightedCode = ({
  code,
  language,
  className,
  preClassName,
  wrapperClassName,
  showCopy = true,
  peekLines,
}: SyntaxHighlightedCodeProps) => {
  const highlightedHtml = highlightCode(code);
  const normalized = normalizeLanguage(language);
  const lineCount = code.split("\n").length;
  const isPeek =
    typeof peekLines === "number" && peekLines > 0 && lineCount > peekLines;
  // text-sm leading-normal ≈ 1.25rem per line + py-3 (1.5rem)
  const peekMaxHeight = isPeek
    ? `${peekLines * 1.25 + 1.5}rem`
    : undefined;

  const codeInner = highlightedHtml ? (
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
  );

  return (
    <div
      className={cn(
        "group/code relative mb-0 mt-6 w-full",
        isPeek && "mb-0 mt-0 overflow-hidden rounded-lg bg-muted",
        wrapperClassName,
      )}
      {...(isPeek
        ? {
            "data-code-peek": "",
            "data-expanded": "false",
            "data-peek-max": peekMaxHeight,
          }
        : {})}
    >
      {showCopy ? (
        <button
          type="button"
          data-slot="button"
          data-mdx-copy
          data-copied="false"
          aria-label="Copy code"
          className={cn(
            "group/button absolute top-2 right-2 z-10 inline-flex size-7 shrink-0 items-center justify-center rounded-[min(var(--radius-md),12px)] border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none",
            "hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px dark:hover:bg-muted/50",
            "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
          )}
        >
          <span className="relative size-4 shrink-0" aria-hidden>
            <CopyIcon className="absolute inset-0 size-4 transition-opacity group-data-[copied=true]/button:opacity-0" />
            <CheckIcon className="absolute inset-0 size-4 opacity-0 transition-opacity group-data-[copied=true]/button:opacity-100" />
          </span>
        </button>
      ) : null}

      <div
        data-peek-body={isPeek ? "" : undefined}
        className={cn(
          isPeek &&
            "relative overflow-hidden [[data-code-peek][data-expanded=true]_&]:max-h-none!",
        )}
        style={
          isPeek && peekMaxHeight
            ? ({ maxHeight: peekMaxHeight } as React.CSSProperties)
            : undefined
        }
      >
        <pre
          className={cn(
            "block w-full overflow-x-auto overflow-y-hidden rounded-lg bg-muted py-3 pr-14 pl-4 text-sm leading-normal",
            isPeek && "rounded-none bg-transparent",
            preClassName,
          )}
          data-language={normalized || undefined}
        >
          {codeInner}
        </pre>
        {isPeek ? (
          <div
            className="pointer-events-none absolute inset-x-0 -bottom-3 h-12 bg-linear-to-t from-muted to-transparent [[data-code-peek][data-expanded=true]_&]:hidden"
            aria-hidden
          />
        ) : null}
      </div>

      {isPeek ? (
        <div className="relative z-10 -mt-3 flex justify-center pb-2">
          <button
            type="button"
            data-code-peek-toggle
            aria-expanded="false"
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground shadow-xs hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span data-code-peek-label>View code</span>
            <ChevronIcon className="size-3.5 transition-transform [[data-code-peek][data-expanded=true]_&]:rotate-180" />
          </button>
        </div>
      ) : null}
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
          "mb-4 mt-6 block w-full overflow-x-auto overflow-y-hidden rounded-lg bg-muted p-4 text-sm",
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
