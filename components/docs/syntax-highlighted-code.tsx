"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SyntaxHighlightedCodeProps = {
  code: string;
  language?: string;
  className?: string;
  preClassName?: string;
  wrapperClassName?: string;
  showCopy?: boolean;
};

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

/**
 * Renders plain code on the server, then applies sugar-high after mount
 * (avoids hydration mismatch).
 */
export const SyntaxHighlightedCode = ({
  code,
  language,
  className,
  preClassName,
  wrapperClassName,
  showCopy = true,
}: SyntaxHighlightedCodeProps) => {
  const [highlightedHtml, setHighlightedHtml] = React.useState<string | null>(
    null,
  );
  const [copied, setCopied] = React.useState(false);
  const copyResetRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    const highlightCode = async () => {
      try {
        const { highlight } = await import("sugar-high");
        const html = highlight(code);
        if (!cancelled) setHighlightedHtml(html);
      } catch {
        if (!cancelled) setHighlightedHtml(null);
      }
    };

    void highlightCode();
    return () => {
      cancelled = true;
    };
  }, [code]);

  React.useEffect(() => {
    return () => {
      if (copyResetRef.current != null) {
        window.clearTimeout(copyResetRef.current);
      }
    };
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      if (copyResetRef.current != null) {
        window.clearTimeout(copyResetRef.current);
      }
      copyResetRef.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const normalized = normalizeLanguage(language);

  return (
    <div className={cn("group/code relative mb-4 mt-6 w-full", wrapperClassName)}>
      {showCopy ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            "absolute top-2 right-2 z-10 h-8 gap-1.5",
            "border-border/60 bg-background text-foreground shadow-xs",
            "opacity-100 sm:opacity-0 sm:transition-opacity",
            "sm:group-hover/code:opacity-100 sm:focus-visible:opacity-100",
          )}
          onClick={handleCopy}
          aria-label={copied ? "Copied" : "Copy code"}
        >
          <span className="relative size-3.5 shrink-0" aria-hidden>
            <Copy
              className={cn(
                "absolute inset-0 size-3.5 transition-opacity",
                copied ? "opacity-0" : "opacity-100",
              )}
            />
            <Check
              className={cn(
                "absolute inset-0 size-3.5 transition-opacity",
                copied ? "opacity-100" : "opacity-0",
              )}
            />
          </span>
          Copy
        </Button>
      ) : null}

      <pre
        className={cn(
          "block w-full overflow-x-auto rounded-lg bg-muted py-3 pr-14 pl-4 text-sm leading-[1.5]",
          preClassName,
        )}
        data-language={normalized || undefined}
      >
        {highlightedHtml ? (
          <code
            className={cn(
              "font-mono text-[0.925em] leading-[1.5] text-foreground bg-transparent p-0",
              className,
            )}
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
          />
        ) : (
          <code
            className={cn(
              "font-mono text-[0.925em] leading-[1.5] text-foreground",
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
